const SESSION_DURATION_MS = 30 * 60 * 1000;

function storageKey(subId: string): string {
  return `aftercare:session:${subId}:until`;
}

export function markSessionComplete(subId: string): void {
  const until = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(storageKey(subId), String(until));
}

export function isSessionActive(subId: string): boolean {
  const raw = localStorage.getItem(storageKey(subId));
  if (!raw) return false;
  const until = Number(raw);
  if (Number.isNaN(until)) return false;
  if (Date.now() > until) {
    localStorage.removeItem(storageKey(subId));
    return false;
  }
  return true;
}

export function clearSession(subId: string): void {
  localStorage.removeItem(storageKey(subId));
}
