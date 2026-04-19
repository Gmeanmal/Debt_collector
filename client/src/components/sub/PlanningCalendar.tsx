import { useRef, useState } from "react";
import type { UpcomingPaymentItem } from "@/services/dashboards/dashboardsApi";
import { formatGBP } from "@/services/format/currency";

const MONTH_LABEL_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
  const [, , dd] = isoDate.split("-");
  return dd.replace(/^0/, "");
}

function formatMonthLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return MONTH_LABEL_FMT.format(d);
}

function isoWeekday(isoDate: string): number {
  const d = new Date(isoDate + "T00:00:00Z");
  return (d.getUTCDay() + 6) % 7;
}

function buildCalendarDays(todayIso: string): string[] {
  const monday = addDays(todayIso, -isoWeekday(todayIso));
  const horizonIso = addDays(todayIso, 30);
  const lastMonday = addDays(horizonIso, -isoWeekday(horizonIso));
  const endIso = addDays(lastMonday, 6);

  const days: string[] = [];
  let cursor = monday;
  while (cursor <= endIso) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

interface TooltipData {
  items: UpcomingPaymentItem[];
  anchor: { top: number; left: number };
}

interface DayCell {
  iso: string;
  upcoming: UpcomingPaymentItem[];
  isToday: boolean;
  inRange: boolean;
}

interface TooltipPopoverProps {
  items: UpcomingPaymentItem[];
  top: number;
  left: number;
}

function TooltipPopover({ items, top, left }: TooltipPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  if (ref.current) {
    ref.current.style.setProperty("--tt-top", `${top}px`);
    ref.current.style.setProperty("--tt-left", `${left}px`);
  }

  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (node) {
          node.style.setProperty("--tt-top", `${top}px`);
          node.style.setProperty("--tt-left", `${left}px`);
        }
      }}
      role="tooltip"
      className="planning-tooltip fixed z-50 bg-bg-elev border border-line rounded px-3 py-2 text-xs shadow-lg pointer-events-none"
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-accent font-semibold">{formatGBP(item.amount)}</span>
          <span className="text-text-mute">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface PlanningCalendarProps {
  upcoming: UpcomingPaymentItem[];
}

export function PlanningCalendar({ upcoming }: PlanningCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const todayIso = isoToday();
  const horizonIso = addDays(todayIso, 30);

  const upcomingByDate = new Map<string, UpcomingPaymentItem[]>();
  for (const item of upcoming) {
    const key = item.date;
    const existing = upcomingByDate.get(key) ?? [];
    existing.push(item);
    upcomingByDate.set(key, existing);
  }

  const calendarDays = buildCalendarDays(todayIso);

  const weekGroups: DayCell[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weekGroups.push(
      calendarDays.slice(i, i + 7).map((iso) => ({
        iso,
        upcoming: upcomingByDate.get(iso) ?? [],
        isToday: iso === todayIso,
        inRange: iso >= todayIso && iso <= horizonIso,
      })),
    );
  }

  const monthLabel = formatMonthLabel(todayIso);

  function handleDayPointerEnter(
    e: React.PointerEvent<HTMLButtonElement>,
    items: UpcomingPaymentItem[],
  ) {
    if (!items.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      items,
      anchor: { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX },
    });
  }

  function handleDayPointerLeave() {
    setTooltip(null);
  }

  function handleDayFocus(e: React.FocusEvent<HTMLButtonElement>, items: UpcomingPaymentItem[]) {
    if (!items.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      items,
      anchor: { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX },
    });
  }

  function handleDayBlur() {
    setTooltip(null);
  }

  return (
    <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
      <h3 className="text-sm font-semibold text-text-mute uppercase tracking-wide mb-3">
        30-day payment calendar — {monthLabel}
      </h3>

      <div className="grid grid-cols-7 gap-px mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs text-text-mute py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-px">
        {weekGroups.map((week) => (
          <div key={week[0].iso} className="grid grid-cols-7 gap-px">
            {week.map((cell) => {
              const hasDue = cell.upcoming.length > 0;
              const baseClass =
                "relative flex flex-col items-center justify-start pt-1 pb-1 rounded min-h-[40px] focus-visible:ring-2 focus-visible:ring-accent outline-none";
              const bgClass = cell.isToday
                ? "bg-accent/10 border border-accent/40"
                : cell.inRange
                  ? "bg-bg-sunken/60 hover:bg-bg-sunken"
                  : "opacity-30";

              return (
                <button
                  key={cell.iso}
                  type="button"
                  aria-label={
                    hasDue
                      ? `${cell.iso}: ${cell.upcoming.length} payment(s) due — ${cell.upcoming.map((u) => `${u.label} ${formatGBP(u.amount)}`).join(", ")}`
                      : cell.iso
                  }
                  className={`${baseClass} ${bgClass} transition-colors`}
                  onPointerEnter={(e) => handleDayPointerEnter(e, cell.upcoming)}
                  onPointerLeave={handleDayPointerLeave}
                  onFocus={(e) => handleDayFocus(e, cell.upcoming)}
                  onBlur={handleDayBlur}
                  tabIndex={cell.inRange ? 0 : -1}
                >
                  <span
                    className={`text-xs font-medium ${cell.isToday ? "text-accent" : cell.inRange ? "text-text" : "text-text-faint"}`}
                  >
                    {formatDisplayDate(cell.iso)}
                  </span>
                  {hasDue && (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {tooltip && (
        <TooltipPopover items={tooltip.items} top={tooltip.anchor.top} left={tooltip.anchor.left} />
      )}
    </div>
  );
}
