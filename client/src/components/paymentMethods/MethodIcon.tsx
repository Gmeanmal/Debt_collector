import type { components } from "@/types/api.generated";
import { cn } from "@/lib/utils";

type PaymentMethodType = components["schemas"]["PaymentMethodType"];

const iconModules = import.meta.glob("@/assets/payments/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ICON_URLS: Partial<Record<PaymentMethodType, string>> = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => {
    const key = path.split("/").pop()!.replace(/\.svg$/, "");
    return [key as PaymentMethodType, url];
  }),
);

export const METHOD_LABELS: Record<PaymentMethodType, string> = {
  throne: "Throne",
  paypal: "PayPal",
  cashapp: "Cash App",
  venmo: "Venmo",
  revolut: "Revolut",
  amazon: "Amazon",
  wishtender: "WishTender",
  tipfunder: "TipFunder",
  onlyfans: "OnlyFans",
  loyalfans: "LoyalFans",
  premium_chat: "Premium Chat",
  sentbio: "Sent.bio",
  sumeria: "Sumeria",
  btc: "Bitcoin",
  eth: "Ethereum",
  bank: "Bank",
  other: "Other",
};

const FALLBACK_BG: Record<PaymentMethodType, string> = {
  throne: "bg-violet-primary/20 text-violet-primary",
  paypal: "bg-status-info/20 text-status-info",
  cashapp: "bg-status-success/20 text-status-success",
  venmo: "bg-status-info/20 text-status-info",
  revolut: "bg-status-info/20 text-status-info",
  amazon: "bg-status-warning/20 text-status-warning",
  wishtender: "bg-pink-primary/20 text-pink-primary",
  tipfunder: "bg-pink-primary/20 text-pink-primary",
  onlyfans: "bg-status-info/20 text-status-info",
  loyalfans: "bg-pink-primary/20 text-pink-primary",
  premium_chat: "bg-violet-primary/20 text-violet-primary",
  sentbio: "bg-status-info/20 text-status-info",
  sumeria: "bg-debt-primary/20 text-debt-primary",
  btc: "bg-status-warning/20 text-status-warning",
  eth: "bg-status-info/20 text-status-info",
  bank: "bg-base-surface-raised text-status-success",
  other: "bg-base-surface-raised text-base-text-muted",
};

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
          "rounded-md object-contain shrink-0 border border-base-border/60 bg-white",
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

export const ALL_METHOD_TYPES: readonly PaymentMethodType[] = [
  "throne",
  "paypal",
  "cashapp",
  "venmo",
  "revolut",
  "amazon",
  "wishtender",
  "tipfunder",
  "onlyfans",
  "loyalfans",
  "premium_chat",
  "sentbio",
  "sumeria",
  "btc",
  "eth",
  "bank",
  "other",
];
