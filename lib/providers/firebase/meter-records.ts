import type { DocumentData } from "firebase-admin/firestore";
import {
  createMeterRecordOffline,
  deleteDeletedMeterRecordCopy,
  deleteMeterRecordCopy,
  hasDeletedMeterRecordsCopy,
  hasMeterRecordsCopy,
  listDeletedMeterRecordsCopy,
  listMeterRecordsCopy,
  purgeDeletedMeterRecordOffline,
  reorderMeterRecordsOffline,
  replaceDeletedMeterRecordsCopy,
  replaceMeterRecordsCopy,
  restoreMeterRecordOffline,
  softDeleteMeterRecordOffline,
  updateMeterRecordOffline,
  upsertDeletedMeterRecordCopy,
  upsertMeterRecordCopy,
} from "@/lib/db/offline-copy";
import { OfflineCopyWriteError } from "@/lib/db/offline-errors";
import { collections, getAdminFirestore } from "@/lib/firebase";
import {
  getCached,
  invalidateCache,
  isFirebaseUnavailable,
  isQuotaError,
  quotaErrorMessage,
  setCached,
} from "@/lib/firestore-cache";
import { getPeriodRange } from "@/lib/period";
import type {
  DeletedMeterRecord,
  MeterRecord,
  MeterRecordInput,
  PeriodFilter,
} from "@/lib/types";

function toRecord(id: string, data: DocumentData): MeterRecord {
  return {
    id,
    date: String(data.date ?? ""),
    accountNumber: String(data.accountNumber ?? ""),
    accountName: String(data.accountName ?? ""),
    address: String(data.address ?? ""),
    meterNumber: String(data.meterNumber ?? ""),
    meterReader: String(data.meterReader ?? ""),
    remarks: String(data.remarks ?? ""),
    contactNumber: String(data.contactNumber ?? ""),
    landmark: String(data.landmark ?? ""),
    latitude: String(data.latitude ?? ""),
    longitude: String(data.longitude ?? ""),
    imageUrl: String(data.imageUrl ?? ""),
    dateReceived: String(data.dateReceived ?? ""),
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

function toDeletedRecord(id: string, data: DocumentData): DeletedMeterRecord {
  return {
    ...toRecord(id, data),
    deletedAt: String(data.deletedAt ?? ""),
    deletedBy: String(data.deletedBy ?? "admin"),
  };
}

function withQuotaHandling(error: unknown): never {
  if (isQuotaError(error)) {
    throw new Error(quotaErrorMessage());
  }
  throw error instanceof Error ? error : new Error("Firestore request failed");
}

function filterByPeriod(records: MeterRecord[], period: PeriodFilter) {
  if (period === "all") return records;
  const { from, to } = getPeriodRange(period);
  if (!from || !to) return records;
  return records.filter((r) => r.date >= from && r.date <= to);
}

/** Assign missing sortOrder in memory only — never write during list reads. */
function applyInMemorySortOrders(
  docs: { id: string; data: DocumentData }[]
) {
  let maxExisting = docs.reduce((max, d) => {
    const value = d.data.sortOrder;
    return typeof value === "number" ? Math.max(max, value) : max;
  }, -1);

  return docs.map((doc) => {
    if (typeof doc.data.sortOrder === "number") return doc;
    maxExisting += 1;
    return {
      id: doc.id,
      data: { ...doc.data, sortOrder: maxExisting },
    };
  });
}

export async function listMeterRecords(period: PeriodFilter = "all") {
  const cacheKey = `meterRecords:all`;
  try {
    let allRecords = getCached<MeterRecord[]>(cacheKey);

    if (!allRecords) {
      const db = getAdminFirestore();
      const snap = await db.collection(collections.meterRecords).limit(500).get();
      const docs = applyInMemorySortOrders(
        snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
      );

      allRecords = docs.map((doc) => toRecord(doc.id, doc.data));
      allRecords.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.createdAt.localeCompare(b.createdAt);
      });
      replaceMeterRecordsCopy(allRecords);
      setCached(cacheKey, allRecords, 45_000);
    }

    return filterByPeriod(allRecords, period);
  } catch (error) {
    if (isFirebaseUnavailable(error) && hasMeterRecordsCopy()) {
      const offline = listMeterRecordsCopy();
      setCached(cacheKey, offline, 45_000);
      return filterByPeriod(offline, period);
    }
    withQuotaHandling(error);
  }
}

export async function createMeterRecord(input: MeterRecordInput) {
  try {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    let nextOrder = 0;
    const cached = getCached<MeterRecord[]>("meterRecords:all");
    if (cached && cached.length > 0) {
      nextOrder = Math.max(...cached.map((r) => r.sortOrder)) + 1;
    } else {
      try {
        const latest = await db
          .collection(collections.meterRecords)
          .orderBy("sortOrder", "desc")
          .limit(1)
          .get();
        if (
          !latest.empty &&
          typeof latest.docs[0]?.data().sortOrder === "number"
        ) {
          nextOrder = Number(latest.docs[0].data().sortOrder) + 1;
        }
      } catch {
        const offline = listMeterRecordsCopy();
        nextOrder =
          offline.length > 0
            ? Math.max(...offline.map((r) => r.sortOrder)) + 1
            : 0;
      }
    }

    const payload = {
      ...input,
      sortOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(collections.meterRecords).add(payload);
    const record = toRecord(ref.id, payload);
    upsertMeterRecordCopy(record);
    invalidateCache("meterRecords");
    return record;
  } catch (error) {
    if (isFirebaseUnavailable(error)) {
      const offline = listMeterRecordsCopy();
      const nextOrder =
        offline.length > 0
          ? Math.max(...offline.map((r) => r.sortOrder)) + 1
          : 0;
      const record = createMeterRecordOffline(input, nextOrder);
      invalidateCache("meterRecords");
      throw new OfflineCopyWriteError(record);
    }
    withQuotaHandling(error);
  }
}

export async function updateMeterRecord(id: string, input: MeterRecordInput) {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(collections.meterRecords).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error("Record not found");
    }

    const payload = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(payload, { merge: true });
    const record = toRecord(id, { ...existing.data(), ...payload });
    upsertMeterRecordCopy(record);
    invalidateCache("meterRecords");
    return record;
  } catch (error) {
    if (error instanceof Error && error.message === "Record not found") {
      throw error;
    }
    if (isFirebaseUnavailable(error)) {
      const record = updateMeterRecordOffline(id, input);
      if (!record) throw new Error("Record not found");
      invalidateCache("meterRecords");
      throw new OfflineCopyWriteError(record);
    }
    withQuotaHandling(error);
  }
}

export async function softDeleteMeterRecord(id: string, deletedBy: string) {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(collections.meterRecords).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error("Record not found");
    }

    const data = existing.data() || {};
    const deletedPayload = {
      ...data,
      deletedAt: new Date().toISOString(),
      deletedBy,
    };

    await db
      .collection(collections.deletedMeterRecords)
      .doc(id)
      .set(deletedPayload);
    await ref.delete();

    const deleted = toDeletedRecord(id, deletedPayload);
    deleteMeterRecordCopy(id);
    upsertDeletedMeterRecordCopy(deleted);
    invalidateCache("meterRecords");
    invalidateCache("deletedMeterRecords");

    return deleted;
  } catch (error) {
    if (error instanceof Error && error.message === "Record not found") {
      throw error;
    }
    if (isFirebaseUnavailable(error)) {
      const deleted = softDeleteMeterRecordOffline(id, deletedBy);
      if (!deleted) throw new Error("Record not found");
      invalidateCache("meterRecords");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(deleted);
    }
    withQuotaHandling(error);
  }
}

export async function listDeletedMeterRecords() {
  const cacheKey = "deletedMeterRecords:all";
  try {
    const cached = getCached<DeletedMeterRecord[]>(cacheKey);
    if (cached) return cached;

    const db = getAdminFirestore();
    let docs: { id: string; data: DocumentData }[] = [];

    try {
      const snap = await db
        .collection(collections.deletedMeterRecords)
        .orderBy("deletedAt", "desc")
        .limit(200)
        .get();
      docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    } catch {
      const snap = await db
        .collection(collections.deletedMeterRecords)
        .limit(200)
        .get();
      docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
      docs.sort((a, b) =>
        String(b.data.deletedAt ?? "").localeCompare(
          String(a.data.deletedAt ?? "")
        )
      );
    }

    const records = docs.map((doc) => toDeletedRecord(doc.id, doc.data));
    replaceDeletedMeterRecordsCopy(records);
    setCached(cacheKey, records, 45_000);
    return records;
  } catch (error) {
    if (isFirebaseUnavailable(error) && hasDeletedMeterRecordsCopy()) {
      const offline = listDeletedMeterRecordsCopy();
      setCached(cacheKey, offline, 45_000);
      return offline;
    }
    // Empty deleted list is valid when both Firebase fails and no local copy.
    if (isFirebaseUnavailable(error) && !hasDeletedMeterRecordsCopy()) {
      return [];
    }
    withQuotaHandling(error);
  }
}

export async function restoreMeterRecord(id: string) {
  try {
    const db = getAdminFirestore();
    const deletedRef = db.collection(collections.deletedMeterRecords).doc(id);
    const deletedSnap = await deletedRef.get();
    if (!deletedSnap.exists) {
      throw new Error("Deleted record not found");
    }

    const data = { ...(deletedSnap.data() || {}) };
    delete data.deletedAt;
    delete data.deletedBy;
    data.updatedAt = new Date().toISOString();

    await db.collection(collections.meterRecords).doc(id).set(data);
    await deletedRef.delete();

    const record = toRecord(id, data);
    upsertMeterRecordCopy(record);
    deleteDeletedMeterRecordCopy(id);
    invalidateCache("meterRecords");
    invalidateCache("deletedMeterRecords");

    return record;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Deleted record not found"
    ) {
      throw error;
    }
    if (isFirebaseUnavailable(error)) {
      const record = restoreMeterRecordOffline(id);
      if (!record) throw new Error("Deleted record not found");
      invalidateCache("meterRecords");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(record);
    }
    withQuotaHandling(error);
  }
}

export async function purgeDeletedMeterRecord(id: string) {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(collections.deletedMeterRecords).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error("Deleted record not found");
    }
    const record = toDeletedRecord(id, existing.data() || {});
    await ref.delete();
    deleteDeletedMeterRecordCopy(id);
    invalidateCache("deletedMeterRecords");
    return record;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Deleted record not found"
    ) {
      throw error;
    }
    if (isFirebaseUnavailable(error)) {
      const record = purgeDeletedMeterRecordOffline(id);
      if (!record) throw new Error("Deleted record not found");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(record);
    }
    withQuotaHandling(error);
  }
}

/** @deprecated Prefer softDeleteMeterRecord */
export async function deleteMeterRecord(id: string) {
  await softDeleteMeterRecord(id, "admin");
}

export async function reorderMeterRecords(orderedIds: string[]) {
  try {
    const db = getAdminFirestore();

    for (let i = 0; i < orderedIds.length; i += 400) {
      const chunk = orderedIds.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((id, index) => {
        batch.set(
          db.collection(collections.meterRecords).doc(id),
          {
            sortOrder: i + index,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    }
    reorderMeterRecordsOffline(orderedIds);
    invalidateCache("meterRecords");
  } catch (error) {
    if (isFirebaseUnavailable(error)) {
      reorderMeterRecordsOffline(orderedIds);
      invalidateCache("meterRecords");
      return;
    }
    withQuotaHandling(error);
  }
}
