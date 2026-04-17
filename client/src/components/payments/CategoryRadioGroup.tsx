import type { PaymentCategory } from "@/services/payments/paymentsApi";
import { cn } from "@/lib/utils";

interface CategoryOption {
  value: PaymentCategory;
  label: string;
  description: string;
}

const SUB_CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "entry",
    label: "Entry tribute",
    description: "Your one-time gateway. Only available on first sign-in.",
  },
  {
    value: "tribute",
    label: "Tribute",
    description: "A free offering outside your rolling obligation.",
  },
  {
    value: "rolling",
    label: "Rolling tribute",
    description: "Your weekly rolling tribute. Counts toward your rolling amount.",
  },
];

interface CategoryRadioGroupProps {
  value: PaymentCategory;
  onChange: (next: PaymentCategory) => void;
  isActive: boolean;
  forcedEntryTribute: boolean;
}

export function CategoryRadioGroup({
  value,
  onChange,
  isActive,
  forcedEntryTribute,
}: CategoryRadioGroupProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-base-text mb-2">Category</legend>
      <div className="flex flex-col gap-3">
        {SUB_CATEGORY_OPTIONS.map(({ value: v, label, description }) => {
          const disabledByActive = v === "entry" && isActive;
          const disabledByForced = forcedEntryTribute && v !== "entry";
          const disabled = disabledByActive || disabledByForced;
          return (
            <label
              key={v}
              className={cn(
                "flex items-start gap-2 text-sm",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              )}
              aria-disabled={disabled}
            >
              <input
                type="radio"
                name="category"
                value={v}
                checked={value === v}
                disabled={disabled}
                aria-disabled={disabled}
                onChange={() => onChange(v)}
                className="accent-pink-primary mt-1"
              />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-base-text">{label}</span>
                <span className="text-xs text-base-text-subtle">{description}</span>
              </span>
            </label>
          );
        })}
        <p className="text-xs text-base-text-subtle mt-1">
          Contract payments (weekly debt, buyout, …) are declared from the contract page.
        </p>
      </div>
    </fieldset>
  );
}
