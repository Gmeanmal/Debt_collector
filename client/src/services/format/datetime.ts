const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatLondon(
  date: string | Date | null | undefined,
  kind: "date" | "datetime" | "time" = "datetime",
): string {
  if (date == null || date === "") return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  if (kind === "date") return DATE_FMT.format(d);
  if (kind === "time") return TIME_FMT.format(d);

  const parts = DATETIME_FMT.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")} · ${get("hour")}:${get("minute")}`;
}
