// YouPay integration helpers.
//
// YouPay's T&C and X-Frame-Options policy as of 2026 do not permit third-party
// iframe embedding. The iframe path is preserved behind VITE_YOUPAY_IFRAME_ALLOWED
// so it can be unlocked without a code change if YouPay's policy changes.
// Default: deep-link only (the safe fallback).

import { env } from "@/utils/env";

const YOUPAY_BASE_URL = "https://youpay.com.au/pay";

/**
 * Returns true only when the operator has explicitly opted in to iframe
 * embedding via the VITE_YOUPAY_IFRAME_ALLOWED env var.
 */
export function isIframeAllowed(): boolean {
  return env.VITE_YOUPAY_IFRAME_ALLOWED === "true";
}

/**
 * Builds a YouPay deep-link URL with amount + reference pre-filled.
 * `amount` is in GBP pence-accurate decimal (e.g. 30.00).
 */
export function buildYouPayUrl(amount: number, reference: string): string {
  const params = new URLSearchParams({
    amount: amount.toFixed(2),
    ref: reference,
    currency: "GBP",
  });
  return `${YOUPAY_BASE_URL}?${params.toString()}`;
}

/**
 * Returns true when the payment method name looks like a YouPay method.
 * Used to decide whether to show the YouPayWidget in the declaration form.
 */
export function isYouPayMethod(methodName: string): boolean {
  return methodName.toLowerCase().includes("youpay");
}
