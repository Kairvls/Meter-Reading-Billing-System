"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeletedMeterRecord } from "@/lib/types";

function formatWhen(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function DeletedDashboard() {
  const [records, setRecords] = useState<DeletedMeterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<DeletedMeterRecord | null>(
    null
  );

  async function loadDeleted() {
    setLoading(true);
    try {
      const res = await fetch("/api/meter-records/deleted");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load deleted records");
      }
      setRecords(data.records as DeletedMeterRecord[]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load deleted records"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeleted();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) =>
      [
        record.accountNumber,
        record.accountName,
        record.meterNumber,
        record.meterReader,
        record.remarks,
        record.address,
        record.deletedBy,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [records, search]);

  async function restore(record: DeletedMeterRecord) {
    setBusyId(record.id);
    try {
      const res = await fetch(`/api/meter-records/${record.id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Restore failed");
      }
      toast.success("Record restored");
      setRecords((prev) => prev.filter((item) => item.id !== record.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmPurge() {
    if (!purgeTarget) return;
    setBusyId(purgeTarget.id);
    try {
      const res = await fetch(`/api/meter-records/${purgeTarget.id}/purge`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Permanent delete failed");
      }
      toast.success("Record permanently deleted");
      setRecords((prev) => prev.filter((item) => item.id !== purgeTarget.id));
      setPurgeTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Permanent delete failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#e6eef3] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3a52] sm:text-2xl">
              Deleted Data
            </h2>
            <p className="mt-1 text-[15px] text-[#6b7c89]">
              Soft-deleted meter records. Restore them back to Overview or
              permanently remove them.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted records..."
            className="h-10 w-full rounded-lg border border-[#cfe6f2] bg-white px-3 text-[15px] text-[#0f3a52] outline-none focus:border-[#0099cc] sm:w-72"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e6eef3] bg-white shadow-[0_8px_30px_rgba(15,58,82,0.05)]">
        <div className="border-b border-[#eef3f6] px-5 py-3 text-[15px] text-[#6b7c89]">
          {loading
            ? "Loading deleted records..."
            : `${filtered.length} deleted record${filtered.length === 1 ? "" : "s"}`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-[#e6eef3] bg-[#f7fafc] text-left text-[13px] font-semibold tracking-wide text-[#6b7c89]">
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Meter No.</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3">Deleted by</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[15px] text-[#6b7c89]"
                  >
                    No deleted records. Deleted overview rows will appear here.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-[#eef3f6] text-[15px] text-[#4d6270]"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#0f3a52]">
                      {formatWhen(record.deletedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#0f3a52]">
                        {record.accountNumber}
                      </p>
                      <p className="text-sm text-[#6b7c89]">
                        {record.accountName}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">{record.meterNumber}</td>
                    <td className="max-w-[220px] truncate px-4 py-3.5">
                      {record.remarks}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#006699]">
                      {record.deletedBy}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
                          disabled={busyId === record.id}
                          onClick={() => void restore(record)}
                        >
                          <RotateCcwIcon />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={busyId === record.id}
                          onClick={() => setPurgeTarget(record)}
                        >
                          <Trash2Icon />
                          Delete forever
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!purgeTarget}
        onOpenChange={(open) => {
          if (!open && !busyId) setPurgeTarget(null);
        }}
      >
        <DialogContent className="border border-[#e6eef3] bg-white p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0f3a52]">
              Delete forever?
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#6b7c89]">
              This will permanently remove{" "}
              <span className="font-semibold text-[#0f3a52]">
                {purgeTarget?.accountName}
              </span>{" "}
              ({purgeTarget?.accountNumber}). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#eef3f6] bg-[#f7fafc]">
            <Button
              type="button"
              variant="outline"
              className="border-[#cfe6f2] text-[15px] text-[#006699]"
              disabled={!!busyId}
              onClick={() => setPurgeTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-[15px] text-white hover:bg-red-700"
              disabled={!!busyId}
              onClick={() => void confirmPurge()}
            >
              {busyId ? "Deleting..." : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
