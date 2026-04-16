// YouPayWidget renders either an iframe (when VITE_YOUPAY_IFRAME_ALLOWED="true")
// or a "Pay via YouPay →" deep-link button (default / safe fallback).
//
// T&C note: YouPay's current X-Frame-Options policy does not permit third-party
// iframe embedding. The iframe branch is preserved for future use but the env
// var must be explicitly flipped to "true" by the operator.
//
// After the sub clicks the deep-link and completes payment on YouPay, they
// return to this page. The `onReferenceReturned` callback is triggered with
// the `youpay_ref` URL parameter (if present) so the declaration form can
// auto-populate the reference field.

import { useEffect } from "react";
import { buildYouPayUrl, isIframeAllowed } from "@/services/payments/youpay";

interface YouPayWidgetProps {
  amount: number;
  reference: string;
  onReferenceReturned?: (ref: string) => void;
}

function useReturnRef(onReferenceReturned?: (ref: string) => void) {
  useEffect(() => {
    if (!onReferenceReturned) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("youpay_ref");
    if (ref) {
      onReferenceReturned(ref);
      // Clean the query param without a full navigation.
      const clean = new URL(window.location.href);
      clean.searchParams.delete("youpay_ref");
      window.history.replaceState(null, "", clean.toString());
    }
  }, [onReferenceReturned]);
}

function YouPayIframe({ src }: { src: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-base-border w-full aspect-video">
      <iframe
        src={src}
        title="Pay via YouPay"
        className="w-full h-full"
        allow="payment"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

function YouPayDeepLink({ href, disabled }: { href: string; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-base-text-subtle">
        You will be redirected to YouPay to complete your payment. Once done, return here to submit
        your declaration.
      </p>
      <a
        href={disabled ? undefined : href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pay via YouPay (opens in new tab)"
        aria-disabled={disabled}
        className={
          disabled
            ? "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-pink-primary/40 text-pink-foreground cursor-not-allowed pointer-events-none self-start"
            : "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-pink-primary text-pink-foreground hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary self-start"
        }
      >
        Pay via YouPay
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

export function YouPayWidget({ amount, reference, onReferenceReturned }: YouPayWidgetProps) {
  useReturnRef(onReferenceReturned);

  const amountValid = amount > 0;
  const url = amountValid ? buildYouPayUrl(amount, reference) : "#";

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-base-border bg-base-surface-raised">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-base-text">Pay via YouPay</span>
        {reference && (
          <span className="text-xs text-base-text-subtle font-mono">ref: {reference}</span>
        )}
      </div>

      {isIframeAllowed() ? (
        <YouPayIframe src={url} />
      ) : (
        <YouPayDeepLink href={url} disabled={!amountValid} />
      )}
    </div>
  );
}
