/**
 * Reads a CSS custom property from :root at call time so chart colours
 * stay in the token system rather than being hardcoded in components.
 *
 * Usage: chartColor("--color-accent") → resolved string e.g. "#ff4fa3"
 * Falls back to the fallback string when running in a non-browser context (SSR / tests).
 */
export function chartColor(property: string, fallback = "#888888"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  return value.length > 0 ? value : fallback;
}

/** Convenience map of the named chart colours used across dashboard panels. */
export const CHART_COLORS = {
  rolling: "--color-accent",
  oneOff: "--color-signal",
  contract: "--color-accent-deep",
  active: "--color-ok-ink",
  completed: "--color-text-mute",
  breached: "--color-bad-ink",
  late: "--color-warn-ink",
  muted: "--color-text-faint",
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;
