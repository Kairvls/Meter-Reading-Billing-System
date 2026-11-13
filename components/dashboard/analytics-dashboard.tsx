"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ActivityIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import {
  buildAnalyticsSummary,
  EMPTY_ANALYTICS,
  type TrendPeriod,
  type TrendPoint,
} from "@/lib/analytics";
import type { MeterRecord } from "@/lib/types";

function PeriodTabs({
  value,
  onChange,
}: {
  value: TrendPeriod;
  onChange: (value: TrendPeriod) => void;
}) {
  const options: { id: TrendPeriod; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
  ];

  return (
    <div className="flex items-center gap-4 text-sm font-medium text-[#8aa0ad]">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={
              active
                ? "border-b-2 border-[#0099cc] pb-0.5 text-[#0099cc]"
                : "pb-0.5 hover:text-[#0f3a52]"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AreaChart({
  title,
  points,
  period,
  onPeriodChange,
  metric,
}: {
  title: string;
  points: TrendPoint[];
  period: TrendPeriod;
  onPeriodChange: (value: TrendPeriod) => void;
  metric: "records" | "accounts";
}) {
  const values = points.map((p) => (metric === "records" ? p.records : p.accounts));
  const max = Math.max(...values, 1);
  const width = 560;
  const height = 220;
  const padX = 12;
  const padY = 18;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const coords = values.map((value, index) => {
    const x =
      values.length <= 1
        ? width / 2
        : padX + (index / (values.length - 1)) * chartW;
    const y = padY + chartH - (value / max) * chartH;
    return { x, y, value };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    coords.length === 0
      ? ""
      : `${linePath} L ${coords[coords.length - 1]!.x} ${padY + chartH} L ${coords[0]!.x} ${padY + chartH} Z`;

  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className="rounded-2xl border border-[#e8eef2] bg-white p-5 shadow-[0_10px_30px_rgba(15,58,82,0.04)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1f3645]">{title}</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0f3a52]">
            {total.toLocaleString()}
          </p>
        </div>
        <PeriodTabs value={period} onChange={onPeriodChange} />
      </div>

      <div className="relative h-56 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = padY + chartH * (1 - step);
            return (
              <line
                key={step}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="#edf2f5"
                strokeWidth="1"
              />
            );
          })}
          <defs>
            <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#33b5e5" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#33b5e5" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {areaPath ? (
            <path d={areaPath} fill={`url(#fill-${metric})`} />
          ) : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="#0099cc"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {coords.map((point) => (
            <circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#fff"
              stroke="#0099cc"
              strokeWidth="2.5"
            />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex justify-between gap-1 overflow-hidden text-[11px] text-[#8aa0ad]">
        {points.map((point, index) => {
          const show =
            points.length <= 8 ||
            index === 0 ||
            index === points.length - 1 ||
            index % Math.ceil(points.length / 6) === 0;
          return (
            <span
              key={point.key}
              className={`min-w-0 truncate text-center ${show ? "opacity-100" : "opacity-0"}`}
              style={{ width: `${100 / Math.max(points.length, 1)}%` }}
            >
              {point.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EventBars({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: { name: string; count: number }[];
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-2xl border border-[#e8eef2] bg-white p-5 shadow-[0_10px_30px_rgba(15,58,82,0.04)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1f3645]">{title}</h3>
          <p className="mt-0.5 text-sm text-[#8aa0ad]">{subtitle}</p>
        </div>
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#f3f7fa] text-[#6b7c89]">
          <SearchIcon className="size-4" />
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#8aa0ad]">
          No data available yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const width = Math.max(8, Math.round((item.count / max) * 100));
            return (
              <li key={item.name} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                <span className="truncate text-sm font-medium text-[#4d6270]">
                  {item.name}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#eef3f6]">
                  <div
                    className="h-full rounded-full bg-[#0099cc] transition-[width] duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="min-w-10 text-right text-sm tabular-nums text-[#6b7c89]">
                  {item.count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [recordsPeriod, setRecordsPeriod] = useState<TrendPeriod>("monthly");
  const [accountsPeriod, setAccountsPeriod] = useState<TrendPeriod>("monthly");

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

  const kpiCards = [
    {
      label: "Total records",
      value: summary.total,
      hint: "All defective meters",
      icon: ClipboardListIcon,
      tone: "bg-[#e8f7fc] text-[#0099cc]",
    },
    {
      label: "Today",
      value: summary.today,
      hint: "Reported today",
      icon: CalendarDaysIcon,
      tone: "bg-[#fff6d6] text-[#c49a00]",
    },
    {
      label: "Last 7 days",
      value: summary.thisWeek,
      hint: "Weekly volume",
      icon: ActivityIcon,
      tone: "bg-[#e7f8ef] text-[#1f8f5f]",
    },
    {
      label: "Unique accounts",
      value: summary.uniqueAccounts,
      hint: `${summary.uniqueReaders} active readers`,
      icon: UsersIcon,
      tone: "bg-[#e8f7fc] text-[#0099cc]",
    },
  ];

  const readerRows = summary.byReader.slice(0, 6);
  const readerMax = Math.max(...readerRows.map((row) => row.count), 1);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#e8eef2] bg-white p-5 shadow-[0_10px_30px_rgba(15,58,82,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-[#8aa0ad]">{card.label}</p>
                <span
                  className={`inline-flex size-9 items-center justify-center rounded-full ${card.tone}`}
                >
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-[#0f3a52]">
                {loading ? "—" : card.value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[#8aa0ad]">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {loading ? (
          <>
            <div className="flex h-80 items-center justify-center rounded-2xl border border-[#e8eef2] bg-white text-sm text-[#8aa0ad]">
              Loading chart...
            </div>
            <div className="flex h-80 items-center justify-center rounded-2xl border border-[#e8eef2] bg-white text-sm text-[#8aa0ad]">
              Loading chart...
            </div>
          </>
        ) : (
          <>
            <AreaChart
              title="Total records"
              points={summary.trends[recordsPeriod]}
              period={recordsPeriod}
              onPeriodChange={setRecordsPeriod}
              metric="records"
            />
            <AreaChart
              title="Unique accounts"
              points={summary.trends[accountsPeriod]}
              period={accountsPeriod}
              onPeriodChange={setAccountsPeriod}
              metric="accounts"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e8eef2] bg-white p-5 shadow-[0_10px_30px_rgba(15,58,82,0.04)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#1f3645]">
                Top readers
              </h3>
              <p className="mt-0.5 text-sm text-[#8aa0ad]">
                Readers with the most reported cases
              </p>
            </div>
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#f3f7fa] text-[#6b7c89]">
              <SearchIcon className="size-4" />
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#8aa0ad]">Loading...</p>
          ) : readerRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#8aa0ad]">
              No data available yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[#6b7c89]">
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">
                      Cases
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {readerRows.map((row, index) => {
                    const share = Math.round((row.count / readerMax) * 100);
                    return (
                      <tr
                        key={row.name}
                        className={
                          index % 2 === 0 ? "bg-[#f3f8fc]" : "bg-white"
                        }
                      >
                        <td className="px-4 py-3.5 font-medium text-[#0099cc]">
                          {row.name}
                        </td>
                        <td className="px-4 py-3.5 tabular-nums text-[#4d6270]">
                          {row.count}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-[#4d6270]">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <EventBars
          title="Top remarks"
          subtitle="Most common defect remarks"
          items={loading ? [] : summary.byRemarks.slice(0, 6)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EventBars
          title="Areas affected"
          subtitle="Highest volume by address area"
          items={loading ? [] : summary.byArea.slice(0, 6)}
        />
        <div className="rounded-2xl border border-[#e8eef2] bg-white p-5 shadow-[0_10px_30px_rgba(15,58,82,0.04)] sm:p-6">
          <h3 className="text-base font-semibold text-[#1f3645]">This month</h3>
          <p className="mt-0.5 text-sm text-[#8aa0ad]">
            Snapshot of current period activity
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f3f8fc] px-4 py-4">
              <p className="text-sm text-[#8aa0ad]">Records this month</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#0f3a52]">
                {loading ? "—" : summary.thisMonth.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[#f7fafc] px-4 py-4">
              <p className="text-sm text-[#8aa0ad]">Active readers</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#0f3a52]">
                {loading ? "—" : summary.uniqueReaders.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
