export function hoursToFreshnessLabel(hours: number): string {
  if (hours < 24) {
    return `oldest ${Math.round(hours)} h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `oldest ${days} d ${remainingHours} h`;
}
