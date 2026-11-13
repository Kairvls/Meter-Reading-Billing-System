import { randomUUID } from "node:crypto";
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
import {
  getCached,
  invalidateCache,
  isCloudUnavailable,
  setCached,
} from "@/lib/firestore-cache";
import { getPeriodRange } from "@/lib/period";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type {
  DeletedMeterRecord,
  MeterRecord,
  MeterRecordInput,
  PeriodFilter,
} from "@/lib/types";

type MeterRow = {
  id: string;
  date: string;
  account_number: string;
  account_name: string;
  address: string;
  meter_number: string;
  meter_reader: string;
  remarks: string;
  contact_number: string | null;
  landmark: string | null;
  latitude: string | null;
  longitude: string | null;
  image_url: string | null;
  date_received: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type DeletedRow = MeterRow & {
  deleted_at: string;
  deleted_by: string;
};

function rowToRecord(row: MeterRow): MeterRecord {
  return {
    id: row.id,
    date: row.date,
    accountNumber: row.account_number,
    accountName: row.account_name,
    address: row.address,
    meterNumber: row.meter_number,
    meterReader: row.meter_reader,
    remarks: row.remarks,
    contactNumber: row.contact_number ?? "",
    landmark: row.landmark ?? "",
    latitude: row.latitude ?? "",
    longitude: row.longitude ?? "",
    imageUrl: row.image_url ?? "",
    dateReceived: row.date_received ?? "",
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDeleted(row: DeletedRow): DeletedMeterRecord {
  return {
    ...rowToRecord(row),
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

function recordToRow(record: MeterRecord) {
  return {
    id: record.id,
    date: record.date,
    account_number: record.accountNumber,
    account_name: record.accountName,
    address: record.address,
    meter_number: record.meterNumber,
    meter_reader: record.meterReader,
    remarks: record.remarks,
    contact_number: record.contactNumber,
    landmark: record.landmark,
    latitude: record.latitude,
    longitude: record.longitude,
    image_url: record.imageUrl,
    date_received: record.dateReceived,
    sort_order: record.sortOrder,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function deletedToRow(record: DeletedMeterRecord) {
  return {
    ...recordToRow(record),
    deleted_at: record.deletedAt,
    deleted_by: record.deletedBy,
  };
}

function filterByPeriod(records: MeterRecord[], period: PeriodFilter) {
  if (period === "all") return records;
  const { from, to } = getPeriodRange(period);
  if (!from || !to) return records;
  return records.filter((r) => r.date >= from && r.date <= to);
}

function throwCloud(error: unknown): never {
  throw new Error(formatSupabaseError(error));
}

export async function listMeterRecords(period: PeriodFilter = "all") {
  const cacheKey = "meterRecords:all";
  try {
    let allRecords = getCached<MeterRecord[]>(cacheKey);
    if (!allRecords) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("meter_records")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;

      allRecords = ((data || []) as MeterRow[]).map(rowToRecord);
      replaceMeterRecordsCopy(allRecords);
      setCached(cacheKey, allRecords, 45_000);
    }
    return filterByPeriod(allRecords, period);
  } catch (error) {
    if (isCloudUnavailable(error) && hasMeterRecordsCopy()) {
      const offline = listMeterRecordsCopy();
      setCached(cacheKey, offline, 45_000);
      return filterByPeriod(offline, period);
    }
    throwCloud(error);
  }
}

export async function createMeterRecord(input: MeterRecordInput) {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const cached = getCached<MeterRecord[]>("meterRecords:all");
    let nextOrder = 0;
    if (cached && cached.length > 0) {
      nextOrder = Math.max(...cached.map((r) => r.sortOrder)) + 1;
    } else {
      const { data } = await supabase
        .from("meter_records")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      if (data?.[0]?.sort_order != null) {
        nextOrder = Number(data[0].sort_order) + 1;
      }
    }

    const record: MeterRecord = {
      id: randomUUID(),
      ...input,
      sortOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from("meter_records").insert(recordToRow(record));
    if (error) throw error;

    try {
      upsertMeterRecordCopy(record);
    } catch (copyError) {
      console.error("Failed to sync offline SQLite copy", copyError);
    }
    invalidateCache("meterRecords");
    return record;
  } catch (error) {
    if (isCloudUnavailable(error)) {
      const offline = listMeterRecordsCopy();
      const nextOrder =
        offline.length > 0
          ? Math.max(...offline.map((r) => r.sortOrder)) + 1
          : 0;
      const record = createMeterRecordOffline(input, nextOrder);
      invalidateCache("meterRecords");
      throw new OfflineCopyWriteError(record);
    }
    throwCloud(error);
  }
}

export async function updateMeterRecord(id: string, input: MeterRecordInput) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("meter_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new Error("Record not found");

    const current = rowToRecord(existing as MeterRow);
    const record: MeterRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("meter_records")
      .update(recordToRow(record))
      .eq("id", id);
    if (error) throw error;

    upsertMeterRecordCopy(record);
    invalidateCache("meterRecords");
    return record;
  } catch (error) {
    if (error instanceof Error && error.message === "Record not found") throw error;
    if (isCloudUnavailable(error)) {
      const record = updateMeterRecordOffline(id, input);
      if (!record) throw new Error("Record not found");
      invalidateCache("meterRecords");
      throw new OfflineCopyWriteError(record);
    }
    throwCloud(error);
  }
}

export async function softDeleteMeterRecord(id: string, deletedBy: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("meter_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new Error("Record not found");

    const current = rowToRecord(existing as MeterRow);
    const deleted: DeletedMeterRecord = {
      ...current,
      deletedAt: new Date().toISOString(),
      deletedBy,
    };

    const { error: insertError } = await supabase
      .from("deleted_meter_records")
      .upsert(deletedToRow(deleted));
    if (insertError) throw insertError;

    const { error: deleteError } = await supabase
      .from("meter_records")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;

    deleteMeterRecordCopy(id);
    upsertDeletedMeterRecordCopy(deleted);
    invalidateCache("meterRecords");
    invalidateCache("deletedMeterRecords");
    return deleted;
  } catch (error) {
    if (error instanceof Error && error.message === "Record not found") throw error;
    if (isCloudUnavailable(error)) {
      const deleted = softDeleteMeterRecordOffline(id, deletedBy);
      if (!deleted) throw new Error("Record not found");
      invalidateCache("meterRecords");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(deleted);
    }
    throwCloud(error);
  }
}

export async function listDeletedMeterRecords() {
  const cacheKey = "deletedMeterRecords:all";
  try {
    const cached = getCached<DeletedMeterRecord[]>(cacheKey);
    if (cached) return cached;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("deleted_meter_records")
      .select("*")
      .order("deleted_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const records = ((data || []) as DeletedRow[]).map(rowToDeleted);
    replaceDeletedMeterRecordsCopy(records);
    setCached(cacheKey, records, 45_000);
    return records;
  } catch (error) {
    if (isCloudUnavailable(error) && hasDeletedMeterRecordsCopy()) {
      const offline = listDeletedMeterRecordsCopy();
      setCached(cacheKey, offline, 45_000);
      return offline;
    }
    if (isCloudUnavailable(error)) return [];
    throwCloud(error);
  }
}

export async function restoreMeterRecord(id: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("deleted_meter_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new Error("Deleted record not found");

    const deleted = rowToDeleted(existing as DeletedRow);
    const { deletedAt: _a, deletedBy: _b, ...rest } = deleted;
    const record: MeterRecord = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("meter_records")
      .upsert(recordToRow(record));
    if (insertError) throw insertError;

    const { error: deleteError } = await supabase
      .from("deleted_meter_records")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;

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
    if (isCloudUnavailable(error)) {
      const record = restoreMeterRecordOffline(id);
      if (!record) throw new Error("Deleted record not found");
      invalidateCache("meterRecords");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(record);
    }
    throwCloud(error);
  }
}

export async function purgeDeletedMeterRecord(id: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: findError } = await supabase
      .from("deleted_meter_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) throw new Error("Deleted record not found");

    const record = rowToDeleted(existing as DeletedRow);
    const { error } = await supabase
      .from("deleted_meter_records")
      .delete()
      .eq("id", id);
    if (error) throw error;

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
    if (isCloudUnavailable(error)) {
      const record = purgeDeletedMeterRecordOffline(id);
      if (!record) throw new Error("Deleted record not found");
      invalidateCache("deletedMeterRecords");
      throw new OfflineCopyWriteError(record);
    }
    throwCloud(error);
  }
}

export async function deleteMeterRecord(id: string) {
  await softDeleteMeterRecord(id, "admin");
}

export async function reorderMeterRecords(orderedIds: string[]) {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i += 1) {
      const id = orderedIds[i]!;
      const { error } = await supabase
        .from("meter_records")
        .update({ sort_order: i, updated_at: now })
        .eq("id", id);
      if (error) throw error;
    }
    reorderMeterRecordsOffline(orderedIds);
    invalidateCache("meterRecords");
  } catch (error) {
    if (isCloudUnavailable(error)) {
      reorderMeterRecordsOffline(orderedIds);
      invalidateCache("meterRecords");
      return;
    }
    throwCloud(error);
  }
}
