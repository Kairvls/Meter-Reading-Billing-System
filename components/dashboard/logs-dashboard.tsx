"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUpIcon,
  FileDownIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import type { ActivityAction, ActivityLog } from "@/lib/types";

const ACTION_META: Record<
  ActivityAction,
  { label: string; className: string; icon: typeof PlusIcon }
> = {
  create: {
    label: "Created",
    className: "bg-[#e8f7fc] text-[#006699]",
    icon: PlusIcon,
  },
  update: {
    label: "Updated",
    className: "bg-[#fff6d6] text-[#8a6d00]",
    icon: PencilIcon,
  },
  delete: {
    label: "Deleted",
    className: "bg-red-50 text-red-600",
    icon: Trash2Icon,
  },
  restore: {
    label: "Restored",
    className: "bg-emerald-50 text-emerald-700",
    icon: RotateCcwIcon,
  },
  reorder: {
    label: "Reordered",
    className: "bg-[#eef3f6] text-[#4d6270]",
    icon: ArrowDownUpIcon,
  },
  export: {
    label: "Exported",
    className: "bg-[#e8f7fc] text-[#006699]",
    icon: FileDownIcon,
  },
  import: {
    label: "Imported",
    className: "bg-[#e8f7fc] text-[#006699]",
    icon: FileUpIcon,
  },
  purge: {
    label: "Purged",
    className: "bg-red-50 text-red-700",
    icon: Trash2Icon,
  },
};

function formatWhen(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function LogsDashboard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "all">(
    "all"
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/activity-logs");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load logs");
        }
        if (!cancelled) setLogs(data.logs as ActivityLog[]);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load logs"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!q) return true;
      return [
        log.message,
        log.actor,
        log.accountName,
        log.accountNumber,
        log.action,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [logs, search, actionFilter]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#e6eef3] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3a52] sm:text-2xl">
              Records of Logs
            </h2>
            <p className="mt-1 text-[15px] text-[#6b7c89]">
              Audit trail for create, edit, delete, restore, reorder, and export
              actions.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Filter by action"
              value={actionFilter}
              onChange={(e) =>
                setActionFilter(e.target.value as ActivityAction | "all")
              }
              className="h-10 rounded-lg border border-[#cfe6f2] bg-white px-3 text-[15px] text-[#0f3a52] outline-none focus:border-[#0099cc]"
            >
              <option value="all">All actions</option>
              {Object.entries(ACTION_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="h-10 w-full rounded-lg border border-[#cfe6f2] bg-white px-3 text-[15px] text-[#0f3a52] outline-none focus:border-[#0099cc] sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e6eef3] bg-white shadow-[0_8px_30px_rgba(15,58,82,0.05)]">
        <div className="border-b border-[#eef3f6] px-5 py-3 text-[15px] text-[#6b7c89]">
          {loading
            ? "Loading logs..."
            : `${filtered.length} log${filtered.length === 1 ? "" : "s"}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-[#e6eef3] bg-[#f7fafc] text-left text-[13px] font-semibold tracking-wide text-[#6b7c89]">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Actor</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-[15px] text-[#6b7c89]"
                  >
                    No activity logs yet. Create, edit, or delete a record to
                    start the trail.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const meta = ACTION_META[log.action] || ACTION_META.update;
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-[#eef3f6] text-[15px] text-[#4d6270]"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#0f3a52]">
                        {formatWhen(log.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${meta.className}`}
                        >
                          <Icon className="size-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="max-w-[360px] px-4 py-3.5 text-[#0f3a52]">
                        {log.message}
                      </td>
                      <td className="px-4 py-3.5">
                        {log.accountNumber ? (
                          <div>
                            <p className="font-medium text-[#0f3a52]">
                              {log.accountNumber}
                            </p>
                            <p className="text-sm text-[#6b7c89]">
                              {log.accountName || "—"}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#006699]">
                        {log.actor}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
