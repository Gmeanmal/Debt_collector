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
  const activeOption = SUB_CATEGORY_OPTIONS.find((o) => o.value === value);

  return (
    <fieldset>
      <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint mb-2">
        Category
      </legend>
      <div
        role="radiogroup"
        aria-label="Category"
        className="inline-flex items-center gap-0.5 bg-bg-elev border border-line rounded-[999px] p-0.5"
      >
        {SUB_CATEGORY_OPTIONS.map(({ value: v, label }) => {
          const disabledByActive = v === "entry" && isActive;
          const disabledByForced = forcedEntryTribute && v !== "entry";
          const disabled = disabledByActive || disabledByForced;
          const selected = value === v;
          return (
            <label
              key={v}
              className={cn(
                "relative inline-flex items-center rounded-[999px] px-3 py-1.5 text-[13px] leading-none transition-colors",
                selected
                  ? "bg-accent-trace text-accent-deep font-semibold"
                  : "text-text-mute hover:text-text",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              )}
              aria-disabled={disabled}
            >
              <input
                type="radio"
                name="category"
                value={v}
                checked={selected}
                disabled={disabled}
                aria-disabled={disabled}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
      {activeOption && (
        <p className="text-xs text-text-mute mt-2">{activeOption.description}</p>
      )}
      <p className="text-xs text-text-faint mt-1">
        Contract payments (weekly debt, buyout, …) are declared from the contract page.
      </p>
    </fieldset>
  );
}
