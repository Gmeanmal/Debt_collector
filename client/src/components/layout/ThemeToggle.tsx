import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useTheme, type ThemePref } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

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
      className="inline-flex items-center rounded-full border border-base-border bg-base-surface p-0.5"
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
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
              active
                ? "bg-pink-primary text-pink-foreground shadow-[0_0_0_1px_rgba(255,79,163,0.55)_inset]"
                : "text-base-text-subtle hover:text-base-text",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
