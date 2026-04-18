import { cn } from "@/lib/utils";
import type { PenaltyTrigger } from "@/services/penaltyRules/penaltyRulesApi";
import type { WizardErrors, WizardState } from "./types";

interface Props {
  state: WizardState;
  errors: WizardErrors;
  onChange: (trigger: PenaltyTrigger) => void;
}

const TRIGGERS: { value: PenaltyTrigger; label: string; subtext: string }[] = [
  {
    value: "contract_missed",
    label: "Contract missed",
    subtext: "A sub misses a scheduled contract payment.",
  },
  {
    value: "ritual_missed",
    label: "Ritual missed",
    subtext: "A daily ritual is not completed before the deadline.",
  },
  {
    value: "rolling_late",
    label: "Rolling late",
    subtext: "A rolling payment is overdue by a configurable number of days.",
  },
  {
    value: "task_missed",
    label: "Task missed",
    subtext: "A one-off task expires without being marked complete.",
  },
];

export function Step1Trigger({ state, errors, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-base-text-muted">When does this rule fire?</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Trigger">
        {TRIGGERS.map(({ value, label, subtext }) => {
          const checked = state.trigger === value;
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
                name="trigger"
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
      {errors.trigger && <p className="text-xs text-status-danger">{errors.trigger}</p>}
    </div>
  );
}
