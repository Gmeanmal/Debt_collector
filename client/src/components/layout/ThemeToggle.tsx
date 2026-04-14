import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTheme, type ThemePref } from "@/hooks/useTheme";

interface Option {
  value: ThemePref;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const OPTIONS: Option[] = [
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "dark", label: "Dark theme", Icon: Moon },
  { value: "light", label: "Light theme", Icon: Sun },
];

export function ThemeToggle() {
  const { pref, setPref } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className="inline-flex items-center rounded-md border border-base-border bg-base-surface-raised p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => void setPref(value)}
            className={`flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
              active
                ? "bg-pink-primary text-pink-foreground"
                : "text-base-text-muted hover:text-base-text"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
