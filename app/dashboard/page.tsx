"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  FileUpIcon,
  PlusIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react";
import { ExportSignatoriesDialog } from "@/components/dashboard/export-signatories-dialog";
import { ImageViewDialog } from "@/components/dashboard/image-view-dialog";
import { RecordFormDialog } from "@/components/dashboard/record-form-dialog";
import { RecordViewDialog } from "@/components/dashboard/record-view-dialog";
import { SortableRecordRow } from "@/components/dashboard/sortable-record-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exportRecordsToExcel,
  exportRecordsToPdf,
  printRecords,
} from "@/lib/export-records";
import type { ExportSignatories } from "@/lib/export-signatories";
import { parseMeterRecordsFromExcel } from "@/lib/import-records";
import type { MeterRecord, MeterRecordInput, PeriodFilter } from "@/lib/types";

const headerClass =
  "border-b border-[#e6eef3] bg-white px-3 py-3 text-left font-sans text-[13px] font-semibold tracking-wide text-[#6b7c89] whitespace-nowrap";
const cellClass =
  "max-w-0 overflow-hidden border-b border-[#eef3f6] px-3 py-3.5 align-middle font-sans text-[15px] text-[#4d6270]";

const PAGE_SIZE = 25;

const filters: { id: PeriodFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const selectClass =
  "h-9 cursor-pointer rounded-lg border border-[#cfe6f2] bg-white px-2 text-sm text-[#0f3a52] outline-none focus:border-[#0099cc]";

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MeterRecord | null>(null);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeterRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [exportKind, setExportKind] = useState<"pdf" | "excel" | "print" | null>(
    null
  );
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [imageViewRecord, setImageViewRecord] = useState<MeterRecord | null>(
    null
  );
  const [viewRecord, setViewRecord] = useState<MeterRecord | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meter-records?period=${period}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load records");
      }
      setRecords(data.records as MeterRecord[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const [yearOptions, setYearOptions] = useState<string[]>([]);

  useEffect(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= currentYear - 5; y -= 1) {
      years.add(String(y));
    }
    for (const record of records) {
      if (record.date.length >= 4) years.add(record.date.slice(0, 4));
    }
    setYearOptions(Array.from(years).sort((a, b) => Number(b) - Number(a)));
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedDate) {
        if (r.date !== selectedDate) return false;
      } else {
        if (filterYear && !r.date.startsWith(filterYear)) return false;
        if (filterMonth && r.date.slice(5, 7) !== filterMonth) return false;
      }
      if (!q) return true;
      return [
        r.accountNumber,
        r.accountName,
        r.meterNumber,
        r.meterReader,
        r.sepMeterReader,
        r.remarks,
        r.address,
        r.homeAddress,
        r.barangay,
        r.streetBlock,
        r.landmark,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [records, search, selectedDate, filterMonth, filterYear]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [period, search, selectedDate, filterMonth, filterYear]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!calendarOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [calendarOpen]);

  async function handleSave(values: MeterRecordInput) {
    try {
      const url = editing
        ? `/api/meter-records/${editing.id}`
        : "/api/meter-records";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Save failed");
      }
      if (data.offline) {
        toast.warning(
          data.warning ||
            "Saved to offline copy only. Sync when Firebase is available."
        );
      } else {
        toast.success(editing ? "Record updated" : "Record created");
      }
      setEditing(null);
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      throw error;
    }
  }

  async function persistOrder(nextRecords: MeterRecord[]) {
    setSavingOrder(true);
    try {
      const res = await fetch("/api/meter-records/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedIds: nextRecords.map((record) => record.id),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save order");
      }
      toast.success("Row order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save order");
      await loadRecords();
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldFilteredIndex = filtered.findIndex((r) => r.id === active.id);
    const newFilteredIndex = filtered.findIndex((r) => r.id === over.id);
    if (oldFilteredIndex < 0 || newFilteredIndex < 0) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldFullIndex = records.findIndex((r) => r.id === activeId);
    const newFullIndex = records.findIndex((r) => r.id === overId);
    if (oldFullIndex < 0 || newFullIndex < 0) return;

    const nextRecords = arrayMove(records, oldFullIndex, newFullIndex).map(
      (record, index) => ({ ...record, sortOrder: index })
    );
    setRecords(nextRecords);
    await persistOrder(nextRecords);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/meter-records/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Delete failed");
      }
      if (data.offline) {
        toast.warning(
          data.warning ||
            "Saved to offline copy only. Sync when Firebase is available."
        );
      } else {
        toast.success("Record deleted");
      }
      setDeleteTarget(null);
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function openExportDialog(type: "pdf" | "excel" | "print") {
    if (filtered.length === 0) {
      toast.error("No records to export");
      return;
    }
    setExportKind(type);
  }

  async function handleImportExcel(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please upload an .xlsx Excel file");
      return;
    }
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseMeterRecordsFromExcel(buffer);
      if (parsed.records.length === 0) {
        toast.error(
          parsed.errors[0] ||
            "No valid rows found. Check that columns match the table headers."
        );
        return;
      }

      const res = await fetch("/api/meter-records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: parsed.records }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Import failed");
      }

      const count = Number(data.count || parsed.records.length);
      if (data.offline) {
        toast.warning(
          data.warning ||
            `Imported ${count} record${count === 1 ? "" : "s"} to offline copy only.`
        );
      } else {
        toast.success(
          `Imported ${count} record${count === 1 ? "" : "s"} from Excel`
        );
      }
      if (parsed.errors.length > 0) {
        toast.message(
          `${parsed.errors.length} row${parsed.errors.length === 1 ? "" : "s"} skipped`,
          { description: parsed.errors.slice(0, 3).join(" · ") }
        );
      }
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleExport(
    type: "pdf" | "excel" | "print",
    signatories: ExportSignatories
  ) {
    if (filtered.length === 0) {
      toast.error("No records to export");
      return;
    }
    try {
      if (type === "pdf") {
        await exportRecordsToPdf(filtered, signatories);
        toast.success("PDF downloaded");
      } else if (type === "excel") {
        await exportRecordsToExcel(filtered, signatories);
        toast.success("Excel downloaded");
      } else {
        printRecords(filtered, signatories);
        toast.success("Opening print dialog");
      }
      void fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export",
          format: type,
          count: filtered.length,
        }),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  return (
    <main>
      <section className="relative z-10 mx-auto w-full max-w-7xl space-y-5 overflow-x-clip px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Period filter"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-[#e8eef3] bg-[#f4f7fa] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            {filters.map((item) => {
              const active = period === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(item.id)}
                  className={`relative cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium tracking-tight transition-colors duration-200 ${
                    active
                      ? "text-white"
                      : "text-[#5a7384] hover:text-[#0f3a52]"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="period-filter-pill"
                      className="absolute inset-0 rounded-lg bg-[#0099cc] shadow-[0_1px_3px_rgba(0,153,204,0.35)]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex flex-wrap items-center gap-2" ref={calendarRef}>
              <select
                aria-label="Filter by month"
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setSelectedDate("");
                  setPeriod("all");
                }}
                className={`${selectClass} min-w-[118px]`}
              >
                <option value="">All months</option>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by year"
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setSelectedDate("");
                  setPeriod("all");
                }}
                className={`${selectClass} min-w-[96px]`}
              >
                <option value="">All years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCalendarOpen((open) => !open)}
                className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition ${
                  selectedDate || calendarOpen
                    ? "border-[#0099cc] bg-[#e8f7fc] text-[#006699]"
                    : "border-[#cfe6f2] bg-white text-[#4d6f84] hover:bg-[#e8f7fc]"
                }`}
                aria-label="Filter by date"
                title="Filter by date"
              >
                <CalendarIcon className="size-4" />
              </button>

              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#cfe6f2] bg-white px-2 text-xs font-medium text-[#006699] hover:bg-[#e8f7fc]"
                  title="Clear date filter"
                >
                  {selectedDate}
                  <XIcon className="size-3.5" />
                </button>
              ) : null}

              {calendarOpen ? (
                <div className="absolute top-[calc(100%+8px)] left-0 z-40 w-64 rounded-xl border border-[#cfe6f2] bg-white p-3 shadow-[0_12px_40px_rgba(15,58,82,0.12)]">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-[#006699] uppercase">
                    Filter by date
                  </p>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedDate(value);
                      if (value) {
                        setFilterYear(value.slice(0, 4));
                        setFilterMonth(value.slice(5, 7));
                      }
                      setPeriod("all");
                      setCalendarOpen(false);
                    }}
                    className="h-9 w-full rounded-lg border border-[#cfe6f2] bg-white px-3 text-sm text-[#0f3a52] outline-none focus:border-[#0099cc]"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="cursor-pointer text-xs font-medium text-[#4d6f84] hover:text-[#006699]"
                      onClick={() => {
                        setSelectedDate("");
                        setCalendarOpen(false);
                      }}
                    >
                      Clear date
                    </button>
                  </div>
                </div>
              ) : null}

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account, meter, reader..."
                className="h-9 w-full rounded-lg border border-[#cfe6f2] bg-white px-3 text-sm text-[#0f3a52] outline-none focus:border-[#0099cc] sm:w-56"
              />
            </div>
            <Button
              className="bg-[#ffcc00] text-[#0f3a52] hover:bg-[#f0c000]"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <PlusIcon />
              Create
            </Button>
          </div>
        </div>

        <div className="relative w-full">
          <div className="relative w-full overflow-hidden rounded-2xl border border-[#e6eef3] bg-white shadow-[0_8px_30px_rgba(15,58,82,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#eef3f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f3a52]">
                  Defective meter records
                </h2>
                <p className="text-[15px] text-[#6b7c89]">
                  {loading
                    ? "Loading records..."
                    : savingOrder
                      ? "Saving row order..."
                      : totalPages > 1
                        ? `${filtered.length} record${filtered.length === 1 ? "" : "s"} · showing ${pageRows.length} of page ${currentPage}/${totalPages}`
                        : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportExcel(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
                  onClick={() => importInputRef.current?.click()}
                  disabled={loading || importing}
                >
                  <FileUpIcon />
                  {importing ? "Importing..." : "Upload Excel"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
                  onClick={() => openExportDialog("pdf")}
                  disabled={loading || filtered.length === 0}
                >
                  <FileDownIcon />
                  PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
                  onClick={() => openExportDialog("print")}
                  disabled={loading || filtered.length === 0}
                >
                  <PrinterIcon />
                  Print
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#0099cc]/40 text-[#006699] hover:bg-[#e8f7fc]"
                  onClick={() => openExportDialog("excel")}
                  disabled={loading || filtered.length === 0}
                >
                  <FileSpreadsheetIcon />
                  Excel
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => void handleDragEnd(event)}
              >
                <table className="w-full min-w-[1160px] table-fixed border-collapse bg-white font-sans">
                  <colgroup>
                    <col className="w-[3%]" />
                    <col className="w-[7%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[7%]" />
                    <col className="w-[7%]" />
                    <col className="w-[5%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={headerClass} aria-label="Reorder" />
                      <th className={headerClass}>Image</th>
                      <th className={headerClass}>Date</th>
                      <th className={headerClass}>Account No.</th>
                      <th className={headerClass}>Account Name</th>
                      <th className={headerClass}>Meter No.</th>
                      <th className={headerClass}>Reader</th>
                      <th className={headerClass}>Remarks</th>
                      <th className={headerClass}>Address</th>
                      <th className={headerClass}>Landmark</th>
                      <th className={headerClass}>Latitude</th>
                      <th className={headerClass}>Longitude</th>
                      <th className={headerClass} aria-label="Actions" />
                    </tr>
                  </thead>
                  <SortableContext
                    items={pageRows.map((record) => record.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {!loading && pageRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="px-5 py-12 text-center text-sm text-[#6b7c89]"
                          >
                            No records found for this filter.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((record) => (
                          <SortableRecordRow
                            key={record.id}
                            record={record}
                            headerClass={headerClass}
                            cellClass={cellClass}
                            onViewImage={setImageViewRecord}
                            onView={setViewRecord}
                            onEdit={(row) => {
                              setEditing(row);
                              setDialogOpen(true);
                            }}
                            onDelete={setDeleteTarget}
                          />
                        ))
                      )}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-[#eef3f6] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#6b7c89]">
                  {filtered.length === 0
                    ? "0–0 of 0"
                    : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#cfe6f2] text-[#006699]"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeftIcon />
                    Prev
                  </Button>
                  <span className="min-w-20 text-center text-sm font-medium text-[#0f3a52]">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#cfe6f2] text-[#006699]"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSubmit={handleSave}
      />

      <RecordViewDialog
        open={!!viewRecord}
        record={viewRecord}
        onOpenChange={(open) => {
          if (!open) setViewRecord(null);
        }}
        onEdit={(record) => {
          setEditing(record);
          setDialogOpen(true);
        }}
        onViewImage={(record) => {
          setImageViewRecord(record);
        }}
      />

      <ImageViewDialog
        open={!!imageViewRecord}
        record={imageViewRecord}
        onOpenChange={(open) => {
          if (!open) setImageViewRecord(null);
        }}
      />

      <ExportSignatoriesDialog
        open={!!exportKind}
        kind={exportKind}
        onOpenChange={(open) => {
          if (!open) setExportKind(null);
        }}
        onConfirm={(signatories, kind) => {
          void handleExport(kind, signatories);
        }}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent
          className="border border-[#e6eef3] bg-white p-5 sm:max-w-md"
          showCloseButton={!deleting}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0f3a52]">
              Delete record?
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-[#6b7c89]">
              This will permanently remove the defective meter record for{" "}
              <span className="font-semibold text-[#0f3a52]">
                {deleteTarget?.accountName}
              </span>{" "}
              ({deleteTarget?.accountNumber}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#eef3f6] bg-[#f7fafc]">
            <Button
              type="button"
              variant="outline"
              className="border-[#cfe6f2] text-[15px] text-[#006699]"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-[15px] text-white hover:bg-red-700"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
