/**
 * Reads a CSS custom property from :root at call time so chart colours
 * stay in the token system rather than being hardcoded in components.
 *
 * Usage: chartColor("--color-pink-primary") → resolved string e.g. "#ff4fa3"
 * Falls back to the fallback string when running in a non-browser context (SSR / tests).
 */
export function chartColor(property: string, fallback = "#888888"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  return value.length > 0 ? value : fallback;
}

/** Convenience map of the named chart colours used across dashboard panels. */
export const CHART_COLORS = {
  rolling: "--color-pink-primary",
  oneOff: "--color-gold-accent",
  contract: "--color-violet-primary",
  active: "--color-status-success",
  completed: "--color-status-info",
  breached: "--color-status-danger",
  late: "--color-debt-primary",
  muted: "--color-base-text-subtle",
} as const;

export type ChartColorKey = keyof typeof CHART_COLORS;
