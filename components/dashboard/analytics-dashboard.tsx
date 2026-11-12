"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ActivityIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { buildAnalyticsSummary, EMPTY_ANALYTICS } from "@/lib/analytics";
import type { MeterRecord } from "@/lib/types";

function BarList({
  items,
  accent = "#0099cc",
}: {
  items: { name: string; count: number }[];
  accent?: string;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-[15px] text-[#6b7c89]">
        No data available yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const width = Math.max(6, Math.round((item.count / max) * 100));
        return (
          <li key={item.name}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate font-medium text-[#0f3a52]">
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums text-[#6b7c89]">
                {item.count}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eef6fa]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${width}%`, backgroundColor: accent }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MonthChart({
  items,
}: {
  items: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="flex h-56 items-end gap-2 sm:gap-3">
      {items.map((item) => {
        const height = Math.max(8, Math.round((item.count / max) * 100));
        return (
          <div
            key={item.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-semibold tabular-nums text-[#006699]">
              {item.count}
            </span>
            <div className="flex h-40 w-full items-end rounded-lg bg-[#eef6fa] px-1 pb-1">
              <div
                className="w-full rounded-md bg-[linear-gradient(180deg,#33b5e5_0%,#0099cc_100%)] transition-[height] duration-500"
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.count}`}
              />
            </div>
            <span className="truncate text-[11px] font-medium text-[#6b7c89]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/meter-records?period=all");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load analytics");
        }
        if (!cancelled) {
          setRecords(data.records as MeterRecord[]);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load analytics"
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

  const summary = useMemo(() => {
    if (!now) return { ...EMPTY_ANALYTICS, total: records.length };
    return buildAnalyticsSummary(records, now);
  }, [records, now]);

  const cards = [
    {
      label: "Total records",
      value: summary.total,
      icon: ClipboardListIcon,
      tone: "bg-[#e8f7fc] text-[#006699]",
    },
    {
      label: "Today",
      value: summary.today,
      icon: CalendarDaysIcon,
      tone: "bg-[#fff6d6] text-[#8a6d00]",
    },
    {
      label: "Last 7 days",
      value: summary.thisWeek,
      icon: ActivityIcon,
      tone: "bg-[#e8f7fc] text-[#006699]",
    },
    {
      label: "This month",
      value: summary.thisMonth,
      icon: CalendarRangeIcon,
      tone: "bg-[#fff6d6] text-[#8a6d00]",
    },
    {
      label: "Unique accounts",
      value: summary.uniqueAccounts,
      icon: UsersIcon,
      tone: "bg-[#e8f7fc] text-[#006699]",
    },
    {
      label: "Active readers",
      value: summary.uniqueReaders,
      icon: WrenchIcon,
      tone: "bg-[#fff6d6] text-[#8a6d00]",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-[#e6eef3] bg-white px-5 py-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3a52] sm:text-2xl">
              System Analytics
            </h2>
            <p className="mt-1 text-[15px] text-[#6b7c89]">
              Live summary of defective meter records across periods, remarks,
              readers, and areas.
            </p>
          </div>
          <p className="text-sm font-medium text-[#0099cc]">
            {loading ? "Loading..." : `${summary.total} total records`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#6b7c89]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-[#0f3a52]">
                    {loading ? "—" : card.value}
                  </p>
                </div>
                <span
                  className={`inline-flex size-10 items-center justify-center rounded-xl ${card.tone}`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-[#0f3a52]">
            Monthly trend
          </h3>
          <p className="text-sm text-[#6b7c89]">
            Defective meter reports over the last 12 months
          </p>
        </div>
        {loading ? (
          <div className="flex h-56 items-center justify-center text-[15px] text-[#6b7c89]">
            Loading chart...
          </div>
        ) : (
          <MonthChart items={summary.byMonth} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-[#0f3a52]">
            Remarks breakdown
          </h3>
          <p className="mb-4 text-sm text-[#6b7c89]">
            Most common defect remarks
          </p>
          {loading ? (
            <p className="py-8 text-center text-[15px] text-[#6b7c89]">
              Loading...
            </p>
          ) : (
            <BarList items={summary.byRemarks} accent="#0099cc" />
          )}
        </div>

        <div className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:p-6">
          <h3 className="text-lg font-semibold text-[#0f3a52]">Top readers</h3>
          <p className="mb-4 text-sm text-[#6b7c89]">
            Readers with the most reported cases
          </p>
          {loading ? (
            <p className="py-8 text-center text-[15px] text-[#6b7c89]">
              Loading...
            </p>
          ) : (
            <BarList items={summary.byReader} accent="#33b5e5" />
          )}
        </div>

        <div className="rounded-2xl border border-[#e6eef3] bg-white p-5 shadow-[0_8px_30px_rgba(15,58,82,0.05)] sm:p-6">
          <h3 className="text-lg font-semibold text-[#0f3a52]">
            Areas affected
          </h3>
          <p className="mb-4 text-sm text-[#6b7c89]">
            Highest volume by address area
          </p>
          {loading ? (
            <p className="py-8 text-center text-[15px] text-[#6b7c89]">
              Loading...
            </p>
          ) : (
            <BarList items={summary.byArea} accent="#f0c000" />
          )}
        </div>
      </div>
    </section>
  );
}
