import type { components } from "@/types/api.generated";

type PaymentMethodType = components["schemas"]["PaymentMethodType"];

const iconModules = import.meta.glob("@/assets/payments/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const ICON_URLS: Partial<Record<PaymentMethodType, string>> = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => {
    const key = path
      .split("/")
      .pop()!
      .replace(/\.svg$/, "");
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

export const FALLBACK_BG: Record<PaymentMethodType, string> = {
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

export type { PaymentMethodType };
