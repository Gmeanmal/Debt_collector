const DRY_RUN_WINDOW_MS = 5 * 60 * 1000;

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function wasDryRunTooOld(startedAtIso: string, now: Date): boolean {
  const started = new Date(startedAtIso).getTime();
  return now.getTime() - started > DRY_RUN_WINDOW_MS;
}

export function toSentenceLabel(key: string): string {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatStartedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
