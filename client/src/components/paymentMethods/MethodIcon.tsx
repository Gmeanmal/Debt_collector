import { cn } from "@/lib/utils";
import { ICON_URLS, METHOD_LABELS, FALLBACK_BG, type PaymentMethodType } from "./methodMetadata";

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px] p-0.5",
  md: "h-9 w-9 text-xs p-1",
  lg: "h-12 w-12 text-sm p-1.5",
} as const;

interface MethodIconProps {
  type: PaymentMethodType;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  title?: string;
}

export function MethodIcon({ type, size = "md", className, title }: MethodIconProps) {
  const url = ICON_URLS[type];
  const label = title ?? METHOD_LABELS[type];
  const sizeClass = SIZE_CLASSES[size];

  if (url) {
    return (
      <img
        src={url}
        alt={label}
        title={label}
        className={cn(
          "rounded-md object-contain shrink-0 border border-line bg-bg-elev",
          sizeClass,
          className,
        )}
      />
    );
  }

  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold shrink-0",
        FALLBACK_BG[type],
        sizeClass,
        className,
      )}
    >
      {initials}
    </span>
  );
}
