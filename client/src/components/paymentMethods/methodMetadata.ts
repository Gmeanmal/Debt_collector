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
  throne: "bg-accent-trace text-accent-deep",
  paypal: "bg-accent-trace text-accent-deep",
  cashapp: "bg-ok-bg text-ok-ink",
  venmo: "bg-accent-trace text-accent-deep",
  revolut: "bg-accent-trace text-accent-deep",
  amazon: "bg-warn-bg text-warn-ink",
  wishtender: "bg-accent-trace text-accent-deep",
  tipfunder: "bg-accent-trace text-accent-deep",
  onlyfans: "bg-accent-trace text-accent-deep",
  loyalfans: "bg-accent-trace text-accent-deep",
  premium_chat: "bg-accent-trace text-accent-deep",
  sentbio: "bg-accent-trace text-accent-deep",
  sumeria: "bg-bad-bg text-bad-ink",
  btc: "bg-warn-bg text-warn-ink",
  eth: "bg-accent-trace text-accent-deep",
  bank: "bg-bg-sunken text-ok-ink",
  other: "bg-bg-sunken text-text-mute",
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
