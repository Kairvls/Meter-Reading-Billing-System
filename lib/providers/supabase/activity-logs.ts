import { randomUUID } from "node:crypto";
import {
  hasActivityLogsCopy,
  insertActivityLogCopy,
  listActivityLogsCopy,
  replaceActivityLogsCopy,
} from "@/lib/db/offline-copy";
import {
  getCached,
  invalidateCache,
  isCloudUnavailable,
  setCached,
} from "@/lib/firestore-cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ActivityAction, ActivityLog } from "@/lib/types";

type LogRow = {
  id: string;
  action: string;
  actor: string;
  message: string;
  record_id: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
};

function rowToLog(row: LogRow): ActivityLog {
  return {
    id: row.id,
    action: (row.action as ActivityAction) || "update",
    actor: row.actor,
    message: row.message,
    recordId: row.record_id || undefined,
    accountNumber: row.account_number || undefined,
    accountName: row.account_name || undefined,
    createdAt: row.created_at,
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
  const createdAt = new Date().toISOString();
  const id = randomUUID();
  const payload = {
    id,
    action: input.action,
    actor: input.actor,
    message: input.message,
    record_id: input.recordId ?? null,
    account_number: input.accountNumber ?? null,
    account_name: input.accountName ?? null,
    created_at: createdAt,
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("activity_logs").insert(payload);
    if (error) throw error;

    insertActivityLogCopy({
      id,
      action: input.action,
      actor: input.actor,
      message: input.message,
      recordId: input.recordId,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      createdAt,
    });
    invalidateCache("activityLogs");
  } catch (error) {
    insertActivityLogCopy({
      id,
      action: input.action,
      actor: input.actor,
      message: input.message,
      recordId: input.recordId,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      createdAt,
    });
    invalidateCache("activityLogs");
    if (!isCloudUnavailable(error)) {
      console.error("Failed to write activity log", error);
    }
  }
}

export async function listActivityLogs(limit = 100) {
  const cacheKey = `activityLogs:${limit}`;
  try {
    const cached = getCached<ActivityLog[]>(cacheKey);
    if (cached) return cached;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const logs = ((data || []) as LogRow[]).map(rowToLog);
    replaceActivityLogsCopy(logs);
    setCached(cacheKey, logs, 45_000);
    return logs;
  } catch (error) {
    if (isCloudUnavailable(error)) {
      if (hasActivityLogsCopy()) {
        const offline = listActivityLogsCopy(limit);
        setCached(cacheKey, offline, 45_000);
        return offline;
      }
      return [];
    }
    throw error instanceof Error ? error : new Error("Failed to load logs");
  }
}
