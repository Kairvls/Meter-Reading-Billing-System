import { getDatabaseProvider } from "@/lib/db/provider";
import type { ActivityAction, ActivityLog } from "@/lib/types";

type ActivityLogsApi = {
  writeActivityLog: (input: {
    action: ActivityAction;
    actor: string;
    message: string;
    recordId?: string;
    accountNumber?: string;
    accountName?: string;
  }) => Promise<void>;
  listActivityLogs: (limit?: number) => Promise<ActivityLog[]>;
};

async function api(): Promise<ActivityLogsApi> {
  if (getDatabaseProvider() === "supabase") {
    return import("@/lib/providers/supabase/activity-logs");
  }
  return import("@/lib/providers/firebase/activity-logs");
}

export async function writeActivityLog(input: {
  action: ActivityAction;
  actor: string;
  message: string;
  recordId?: string;
  accountNumber?: string;
  accountName?: string;
}) {
  return (await api()).writeActivityLog(input);
}

export async function listActivityLogs(limit = 100) {
  return (await api()).listActivityLogs(limit);
}
