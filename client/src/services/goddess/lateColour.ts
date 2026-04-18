export function daysLateClass(days: number): string {
  if (days >= 7) return "text-status-danger";
  if (days >= 3) return "text-status-warning";
  return "text-base-text";
}
