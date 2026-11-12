import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { PeriodFilter } from "@/lib/types";

export function getPeriodRange(period: PeriodFilter, now = new Date()) {
  if (period === "all") {
    return { from: null as string | null, to: null as string | null };
  }

  if (period === "daily") {
    return {
      from: format(startOfDay(now), "yyyy-MM-dd"),
      to: format(endOfDay(now), "yyyy-MM-dd"),
    };
  }

  if (period === "weekly") {
    return {
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfDay(now), "yyyy-MM-dd"),
    };
  }

  if (period === "monthly") {
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }

  return {
    from: format(startOfYear(now), "yyyy-MM-dd"),
    to: format(endOfYear(now), "yyyy-MM-dd"),
  };
}
