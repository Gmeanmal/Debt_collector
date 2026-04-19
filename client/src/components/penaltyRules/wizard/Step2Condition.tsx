import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { GoddessSub } from "@/services/payments/paymentsApi";
import type { WizardErrors, WizardState } from "./types";

const inputCls =
  "bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full";
const labelCls = "text-xs font-semibold text-text-mute uppercase tracking-wide";

interface Props {
  state: WizardState;
  subs: GoddessSub[];
  errors: WizardErrors;
  onMinDaysChange: (v: string) => void;
  onSubChange: (sub: GoddessSub | null) => void;
}

export function Step2Condition({ state, subs, errors, onMinDaysChange, onSubChange }: Props) {
  const isRollingLate = state.trigger === "rolling_late";
  const days = parseInt(state.minDaysLate, 10);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-mute">Only apply when…</p>

      {isRollingLate && (
        <div className="flex flex-col gap-1">
          <label htmlFor="wizard-min-days" className={labelCls}>
            Minimum days late <span className="normal-case font-normal text-accent-deep">*</span>
          </label>
          <input
            id="wizard-min-days"
            type="number"
            min={1}
            max={90}
            step={1}
            value={state.minDaysLate}
            onChange={(e) => onMinDaysChange(e.target.value)}
            placeholder="7"
            className={inputCls}
            aria-label="Minimum days late"
          />
          {errors.minDaysLate && <p className="text-xs text-bad-ink">{errors.minDaysLate}</p>}
          {!errors.minDaysLate && state.minDaysLate !== "" && !Number.isNaN(days) && days >= 1 && (
            <p className="text-xs text-text-mute italic">
              Applies once a sub is {days} {days === 1 ? "day" : "days"} late.
            </p>
          )}
        </div>
      )}

      {!isRollingLate && (
        <p className="text-sm text-text-mute rounded-[10px] border border-line/50 bg-bg-sunken px-4 py-3">
          No additional conditions for this trigger — the rule fires on every occurrence.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <span className={labelCls}>
          Only for this sub{" "}
          <span className="normal-case font-normal text-text-mute">(optional)</span>
        </span>
        <SearchableSelect<GoddessSub>
          options={subs}
          value={state.selectedSub}
          onChange={onSubChange}
          getLabel={(s) => `${s.display_name} @${s.username}`}
          getValue={(s) => s.id}
          placeholder="All subs (no override)"
          emptyMessage="No active subs"
          nullable
          ariaLabel="Only for this sub"
          renderOption={(s) => (
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium text-text">{s.display_name}</span>
                <span className="block truncate text-xs text-text-mute">@{s.username}</span>
              </span>
            </span>
          )}
        />
      </div>
    </div>
  );
}
