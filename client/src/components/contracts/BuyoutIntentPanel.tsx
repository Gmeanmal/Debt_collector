import { useMutation } from "@tanstack/react-query";
import { buyoutIntentApi, type BuyoutIntentOut } from "@/services/debtContracts/debtContractsApi";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { METHOD_LABELS } from "@/components/paymentMethods/methodMetadata";

interface Props {
  contractId: string;
  onClose: () => void;
}

function fmtGbp(v: string): string {
  return `£${parseFloat(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BuyoutIntentPanel({ contractId, onClose }: Props) {
  const mutation = useMutation<BuyoutIntentOut, Error>({
    mutationFn: () => buyoutIntentApi(contractId),
  });

  const intent = mutation.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-bg/80 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-base-surface border border-base-border rounded-lg w-full max-w-lg p-6 shadow-[var(--shadow-card)] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-base-text">Buyout quote</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
          >
            ✕
          </button>
        </div>

        {!intent && !mutation.isPending && (
          <>
            <p className="text-sm text-base-text-muted">
              Request a current exit-amount quote. Submitting this does not settle the debt — you
              must then declare a <span className="font-semibold">buyout</span> payment for your
              goddess to validate.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors"
              >
                Quote buyout
              </button>
            </div>
          </>
        )}

        {mutation.isPending && <p className="text-sm text-base-text-muted">Computing…</p>}
        {mutation.isError && <p className="text-sm text-status-danger">{mutation.error.message}</p>}

        {intent && (
          <div className="flex flex-col gap-4">
            <div className="bg-base-surface-raised border border-base-border rounded p-4">
              <p className="text-xs text-base-text-muted uppercase tracking-wider">Exit amount</p>
              <p role="status" className="text-2xl font-display text-pink-primary font-bold mt-1">
                {fmtGbp(intent.exit_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-base-text mb-2">Payment methods</p>
              {intent.payment_methods.length === 0 ? (
                <p className="text-sm text-base-text-muted">
                  Your goddess has no enabled payment methods. Contact her directly.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {intent.payment_methods.map((pm) => (
                    <li
                      key={pm.id}
                      className="bg-base-surface-raised border border-base-border rounded p-3 flex items-start gap-3"
                    >
                      <MethodIcon type={pm.type} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-text">
                          {pm.name}{" "}
                          <span className="text-xs text-base-text-muted font-normal">
                            · {METHOD_LABELS[pm.type]}
                          </span>
                        </p>
                        <p className="text-xs text-base-text-muted mt-0.5 break-all">
                          {pm.handle_or_link}
                        </p>
                        {pm.note && (
                          <p className="text-xs text-base-text-subtle italic mt-1">{pm.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-base-text-muted">
              Next step: go to <span className="font-semibold">Declare a payment</span>, choose
              category <span className="font-semibold">buyout</span>, enter the exit amount, and
              submit for your goddess to validate.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
