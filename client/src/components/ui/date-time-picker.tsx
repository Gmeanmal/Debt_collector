import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLondon } from "@/services/format/datetime";

// --- tiny date helpers (no date-fns dep) ---

function today(): Date {
  return new Date();
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon…6=Sun so the calendar grid is Mon-first. */
function dayOfWeekMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function isoToLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function toLocalIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function formatDisplay(date: Date): string {
  return formatLondon(date, "datetime");
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// --- sub-components ---

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}

function CalendarGrid({ year, month, selectedDay, onSelectDay }: CalendarGridProps) {
  const firstDow = dayOfWeekMon(startOfMonth(new Date(year, month, 1)));
  const totalDays = daysInMonth(year, month);
  const now = today();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const cells: Array<number | null> = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
      {DAYS.map((d) => (
        <div key={d} className="text-center text-xs font-semibold text-base-text-subtle py-1">
          {d}
        </div>
      ))}
      {cells.map((day, idx) => {
        if (day === null) {
          return <div key={`empty-${idx}`} />;
        }
        const isSelected = day === selectedDay;
        const isToday = isCurrentMonth && day === now.getDate();
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            aria-label={`${day} ${MONTHS[month]} ${year}`}
            aria-pressed={isSelected}
            className={cn(
              "h-8 w-8 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
              isSelected
                ? "bg-pink-primary text-pink-foreground font-bold"
                : isToday
                  ? "border border-pink-primary text-pink-primary hover:bg-pink-muted"
                  : "text-base-text hover:bg-base-surface-raised",
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

interface TimeSelectsProps {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}

function TimeSelects({ hour, minute, onHourChange, onMinuteChange }: TimeSelectsProps) {
  const selectClass =
    "bg-base-surface-raised border border-base-border rounded-md px-2 py-1 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary";

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-base-border">
      <Clock className="h-4 w-4 text-base-text-subtle shrink-0" />
      <select
        aria-label="Hour"
        value={hour}
        onChange={(e) => onHourChange(Number(e.target.value))}
        className={selectClass}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-base-text-muted font-semibold">:</span>
      <select
        aria-label="Minute"
        value={minute}
        onChange={(e) => onMinuteChange(Number(e.target.value))}
        className={selectClass}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- main export ---

interface DateTimePickerProps {
  value: string | null;
  onChange: (iso: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
}

export function DateTimePicker({ value, onChange, label, placeholder, id }: DateTimePickerProps) {
  const parsed = isoToLocal(value);
  const now = today();

  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(parsed?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(parsed?.getMonth() ?? now.getMonth());
  const [selDay, setSelDay] = React.useState<number | null>(parsed?.getDate() ?? null);
  const [selHour, setSelHour] = React.useState(parsed?.getHours() ?? 12);
  const [selMinute, setSelMinute] = React.useState(() => {
    const m = parsed?.getMinutes() ?? 0;
    return MINUTES.includes(m) ? m : 0;
  });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDaySelect(day: number) {
    setSelDay(day);
    const iso = toLocalIso(viewYear, viewMonth, day, selHour, selMinute);
    onChange(iso);
  }

  function handleHourChange(h: number) {
    setSelHour(h);
    if (selDay !== null) {
      onChange(toLocalIso(viewYear, viewMonth, selDay, h, selMinute));
    }
  }

  function handleMinuteChange(m: number) {
    setSelMinute(m);
    if (selDay !== null) {
      onChange(toLocalIso(viewYear, viewMonth, selDay, selHour, m));
    }
  }

  const displayText = parsed ? formatDisplay(parsed) : (placeholder ?? "Pick a date & time");

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={label ?? "Pick a date and time"}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-base-border bg-base-surface-raised px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
            parsed ? "text-base-text" : "text-base-text-subtle",
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 text-base-text-subtle" />
          <span className="flex-1 text-left">{displayText}</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className={cn(
            "z-50 w-72 rounded-lg border border-base-border bg-base-surface-raised p-4 shadow-card",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="rounded-md p-1 text-base-text-muted hover:bg-base-surface hover:text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-base-text">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="rounded-md p-1 text-base-text-muted hover:bg-base-surface hover:text-base-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            selectedDay={selDay}
            onSelectDay={handleDaySelect}
          />

          <TimeSelects
            hour={selHour}
            minute={selMinute}
            onHourChange={handleHourChange}
            onMinuteChange={handleMinuteChange}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
