import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTheme, type ThemePref } from "@/hooks/useTheme";

const ORDER: ThemePref[] = ["system", "light", "dark"];
const ICONS: Record<ThemePref, ComponentType<SVGProps<SVGSVGElement>>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
const LABELS: Record<ThemePref, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const Icon = ICONS[pref];
  const nextPref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => void setPref(nextPref)}
      aria-label={`Theme: ${LABELS[pref]}. Switch to ${LABELS[nextPref]}.`}
      title={LABELS[pref]}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-base-border bg-base-surface text-base-text-muted transition-colors hover:text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
