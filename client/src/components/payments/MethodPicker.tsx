import type { PaymentMethodOut } from "@/services/payments/paymentsApi";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { METHOD_LABELS } from "@/components/paymentMethods/methodMetadata";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MethodPickerProps {
  methods: PaymentMethodOut[];
  value: string;
  onChange: (methodId: string) => void;
  loading: boolean;
}

export function MethodPicker({ methods, value, onChange, loading }: MethodPickerProps) {
  return (
    <fieldset>
      <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint mb-2">
        Payment method
      </legend>
      {loading ? (
        <p className="text-xs text-text-mute">Loading methods…</p>
      ) : methods.length === 0 ? (
        <p className="text-xs text-text-mute">No payment methods available.</p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label="Payment method">
            <SelectValue placeholder="Select a payment method" />
          </SelectTrigger>
          <SelectContent>
            {methods.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="inline-flex items-center gap-2">
                  <MethodIcon type={m.type} size="sm" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13px] text-text">{m.name}</span>
                    <span className="text-[11px] text-text-faint">{METHOD_LABELS[m.type]}</span>
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </fieldset>
  );
}
