const DAY_ABBREVS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatTime(deadlineTime: string | null | undefined): string {
  if (!deadlineTime) return "23:59";
  return deadlineTime.slice(0, 5);
}

function bitmaskToDayNames(bitmask: number): string[] {
  return DAY_ABBREVS.filter((_, i) => bitmask & (1 << i));
}

interface ScheduleArgs {
  frequency: string;
  custom_days_bitmask?: number | null;
  deadline_time?: string | null;
}

export function formatRitualSchedule({
  frequency,
  custom_days_bitmask,
  deadline_time,
}: ScheduleArgs): string {
  const time = formatTime(deadline_time);

  if (frequency === "daily") {
    return `Every day at ${time}`;
  }

  if (frequency === "weekly") {
    return `Every Monday at ${time}`;
  }

  if (frequency === "custom") {
    if (!custom_days_bitmask) {
      return `Every day at ${time}`;
    }
    const days = bitmaskToDayNames(custom_days_bitmask);
    if (days.length === 0) {
      return `Every day at ${time}`;
    }
    return `Every ${days.join("·")} at ${time}`;
  }

  return `Every day at ${time}`;
}
