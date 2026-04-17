import type { PaymentMethodOut } from "@/services/payments/paymentsApi";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { METHOD_LABELS } from "@/components/paymentMethods/methodMetadata";
import { cn } from "@/lib/utils";

interface MethodPickerProps {
  methods: PaymentMethodOut[];
  value: string;
  onChange: (methodId: string) => void;
  loading: boolean;
}

export function MethodPicker({ methods, value, onChange, loading }: MethodPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-base-text mb-2">Payment method</legend>
      {loading ? (
        <p className="text-xs text-base-text-muted">Loading methods…</p>
      ) : methods.length === 0 ? (
        <p className="text-xs text-base-text-muted">No payment methods available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {methods.map((m) => {
            const selected = value === m.id;
            return (
              <label
                key={m.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                  selected
                    ? "border-pink-primary bg-pink-primary/10"
                    : "border-base-border hover:border-base-border/80 hover:bg-base-surface-raised",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={selected}
                  onChange={() => onChange(m.id)}
                  className="sr-only"
                />
                <MethodIcon type={m.type} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-base-text truncate">{m.name}</p>
                  <p className="text-xs text-base-text-muted truncate">{METHOD_LABELS[m.type]}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
