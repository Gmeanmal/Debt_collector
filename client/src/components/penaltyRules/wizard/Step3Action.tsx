import { cn } from "@/lib/utils";
import type { PenaltyAction } from "@/services/penaltyRules/penaltyRulesApi";
import type { WizardErrors, WizardState } from "./types";

interface Props {
  state: WizardState;
  errors: WizardErrors;
  onChange: (action: PenaltyAction) => void;
}

const ACTIONS: { value: PenaltyAction; label: string; subtext: string }[] = [
  {
    value: "notify_only",
    label: "Notify only",
    subtext: "Send a notification. No points or fee are applied.",
  },
  {
    value: "apply_points",
    label: "Apply points",
    subtext: "Deduct (or add) a points delta from the sub's balance.",
  },
  {
    value: "apply_fee",
    label: "Apply fee",
    subtext: "Record a financial penalty — flat GBP amount or a percentage of the overdue amount.",
  },
];

export function Step3Action({ state, errors, onChange }: Props) {
  const isFee = state.action === "apply_fee";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-text-muted">
        {isFee
          ? "Choose a flat fee or a percentage of the overdue amount."
          : "What happens when this rule fires?"}
      </p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Action">
        {ACTIONS.map(({ value, label, subtext }) => {
          const checked = state.action === value;
          return (
            <label
              key={value}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                checked
                  ? "border-pink-primary bg-pink-primary/5"
                  : "border-base-border hover:border-pink-primary/40",
              )}
            >
              <input
                type="radio"
                name="action"
                value={value}
                checked={checked}
                onChange={() => onChange(value)}
                className="mt-0.5 accent-pink-primary shrink-0"
                aria-label={label}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-base-text">{label}</span>
                <span className="text-xs text-base-text-muted">{subtext}</span>
              </span>
            </label>
          );
        })}
      </div>
      {errors.action && <p className="text-xs text-status-danger">{errors.action}</p>}
    </div>
  );
}
