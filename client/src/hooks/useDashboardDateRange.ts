import { useState, useCallback } from "react";

export type DatePreset = "7d" | "30d" | "90d" | "YTD" | "custom";

export interface DateRange {
  preset: DatePreset;
  from: string;
  to: string;
}

const ISO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayLondon(): string {
  return ISO_DATE_FMT.format(new Date());
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() - days);
  return ISO_DATE_FMT.format(d);
}

function ytdStart(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-01-01`;
}

export function buildRange(preset: DatePreset, customFrom: string, customTo: string): DateRange {
  const today = todayLondon();
  if (preset === "7d") return { preset, from: subtractDays(today, 7), to: today };
  if (preset === "30d") return { preset, from: subtractDays(today, 30), to: today };
  if (preset === "90d") return { preset, from: subtractDays(today, 90), to: today };
  if (preset === "YTD") return { preset, from: ytdStart(today), to: today };
  return { preset, from: customFrom, to: customTo };
}

const DEFAULT_RANGE: DateRange = buildRange("30d", "", "");

export interface UseDashboardDateRangeResult {
  range: DateRange;
  customFrom: string;
  customTo: string;
  setPreset: (preset: DatePreset) => void;
  setCustomFrom: (v: string) => void;
  setCustomTo: (v: string) => void;
  applyCustom: () => void;
  isCustomValid: boolean;
}

export function useDashboardDateRange(): UseDashboardDateRangeResult {
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isCustomValid =
    customFrom.length > 0 && customTo.length > 0 && customFrom <= customTo;

  const setPreset = useCallback(
    (preset: DatePreset) => {
      if (preset === "custom") {
        setRange((prev) => ({ ...prev, preset: "custom" }));
      } else {
        setRange(buildRange(preset, "", ""));
      }
    },
    [],
  );

  const applyCustom = useCallback(() => {
    if (!isCustomValid) return;
    setRange(buildRange("custom", customFrom, customTo));
  }, [customFrom, customTo, isCustomValid]);

  return {
    range,
    customFrom,
    customTo,
    setPreset,
    setCustomFrom,
    setCustomTo,
    applyCustom,
    isCustomValid,
  };
}
