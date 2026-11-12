import type { MeterRecord } from "@/lib/types";

export type NamedCount = {
  name: string;
  count: number;
};

export type MonthBucket = {
  key: string;
  label: string;
  count: number;
};

export type AnalyticsSummary = {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  uniqueAccounts: number;
  uniqueReaders: number;
  byRemarks: NamedCount[];
  byReader: NamedCount[];
  byMonth: MonthBucket[];
  byArea: NamedCount[];
};

export const EMPTY_ANALYTICS: AnalyticsSummary = {
  total: 0,
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  uniqueAccounts: 0,
  uniqueReaders: 0,
  byRemarks: [],
  byReader: [],
  byMonth: [],
  byArea: [],
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseRecordDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function areaFromAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Unknown";
  return parts[parts.length - 1] || parts[0] || "Unknown";
}

function increment(map: Map<string, number>, key: string) {
  const normalized = key.trim() || "Unknown";
  map.set(normalized, (map.get(normalized) || 0) + 1);
}

function toSortedCounts(map: Map<string, number>, limit = 8): NamedCount[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function buildAnalyticsSummary(
  records: MeterRecord[],
  now: Date
): AnalyticsSummary {
  const todayKey = toDateKey(now);
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthKey = todayKey.slice(0, 7);

  const remarks = new Map<string, number>();
  const readers = new Map<string, number>();
  const areas = new Map<string, number>();
  const accounts = new Set<string>();
  const monthMap = new Map<string, number>();

  // Seed last 12 months so empty months still show.
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;

  for (const record of records) {
    accounts.add(record.accountNumber.trim() || record.id);
    increment(remarks, record.remarks);
    increment(readers, record.meterReader);
    increment(areas, areaFromAddress(record.address));

    const recordDate = parseRecordDate(record.date);
    if (!recordDate) continue;

    const key = toDateKey(recordDate);
    const ym = key.slice(0, 7);

    if (monthMap.has(ym)) {
      monthMap.set(ym, (monthMap.get(ym) || 0) + 1);
    }

    if (key === todayKey) today += 1;
    if (ym === monthKey) thisMonth += 1;
    if (recordDate >= weekStart && recordDate <= now) thisWeek += 1;
  }

  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  });

  const byMonth: MonthBucket[] = Array.from(monthMap.entries()).map(
    ([key, count]) => {
      const [year, month] = key.split("-").map(Number);
      const label = monthFormatter.format(new Date(year!, (month || 1) - 1, 1));
      return { key, label, count };
    }
  );

  return {
    total: records.length,
    today,
    thisWeek,
    thisMonth,
    uniqueAccounts: accounts.size,
    uniqueReaders: readers.size,
    byRemarks: toSortedCounts(remarks, 10),
    byReader: toSortedCounts(readers, 8),
    byMonth,
    byArea: toSortedCounts(areas, 8),
  };
}
