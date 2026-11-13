import type { DocumentData } from "firebase-admin/firestore";
import {
  hasActivityLogsCopy,
  insertActivityLogCopy,
  listActivityLogsCopy,
  replaceActivityLogsCopy,
} from "@/lib/db/offline-copy";
import { collections, getAdminFirestore } from "@/lib/firebase";
import {
  getCached,
  invalidateCache,
  isFirebaseUnavailable,
  isQuotaError,
  quotaErrorMessage,
  setCached,
} from "@/lib/firestore-cache";
import type { ActivityAction, ActivityLog } from "@/lib/types";

function toLog(id: string, data: DocumentData): ActivityLog {
  return {
    id,
    action: (data.action as ActivityAction) || "update",
    actor: String(data.actor ?? "admin"),
    message: String(data.message ?? ""),
    recordId: data.recordId ? String(data.recordId) : undefined,
    accountNumber: data.accountNumber ? String(data.accountNumber) : undefined,
    accountName: data.accountName ? String(data.accountName) : undefined,
    createdAt: String(data.createdAt ?? ""),
  };
}

export async function writeActivityLog(input: {
  action: ActivityAction;
  actor: string;
  message: string;
  recordId?: string;
  accountNumber?: string;
  accountName?: string;
}) {
  const payload = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  try {
    const db = getAdminFirestore();
    const ref = await db.collection(collections.activityLogs).add(payload);
    insertActivityLogCopy({
      id: ref.id,
      action: payload.action,
      actor: payload.actor,
      message: payload.message,
      recordId: payload.recordId,
      accountNumber: payload.accountNumber,
      accountName: payload.accountName,
      createdAt: payload.createdAt,
    });
    invalidateCache("activityLogs");
  } catch (error) {
    // Never fail the main action because logging hit quota/network.
    insertActivityLogCopy({
      action: payload.action,
      actor: payload.actor,
      message: payload.message,
      recordId: payload.recordId,
      accountNumber: payload.accountNumber,
      accountName: payload.accountName,
      createdAt: payload.createdAt,
    });
    invalidateCache("activityLogs");
    if (!isFirebaseUnavailable(error) && !isQuotaError(error)) {
      console.error("Failed to write activity log", error);
    }
  }
}

export async function listActivityLogs(limit = 100) {
  const cacheKey = `activityLogs:${limit}`;
  try {
    const cached = getCached<ActivityLog[]>(cacheKey);
    if (cached) return cached;

    const db = getAdminFirestore();
    let docs: { id: string; data: DocumentData }[] = [];

    try {
      const snap = await db
        .collection(collections.activityLogs)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    } catch {
      const snap = await db
        .collection(collections.activityLogs)
        .limit(limit)
        .get();
      docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
      docs.sort((a, b) =>
        String(b.data.createdAt ?? "").localeCompare(
          String(a.data.createdAt ?? "")
        )
      );
    }

    const logs = docs.map((doc) => toLog(doc.id, doc.data));
    replaceActivityLogsCopy(logs);
    setCached(cacheKey, logs, 45_000);
    return logs;
  } catch (error) {
    if (isFirebaseUnavailable(error) || isQuotaError(error)) {
      if (hasActivityLogsCopy()) {
        const offline = listActivityLogsCopy(limit);
        setCached(cacheKey, offline, 45_000);
        return offline;
      }
      return [];
    }
    if (isQuotaError(error)) {
      throw new Error(quotaErrorMessage());
    }
    throw error instanceof Error ? error : new Error("Failed to load logs");
  }
}
