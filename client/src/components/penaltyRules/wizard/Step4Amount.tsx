import { cn } from "@/lib/utils";
import type { WizardErrors, WizardState } from "./types";

const inputCls =
  "bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full";
const labelCls = "text-xs font-semibold text-text-mute uppercase tracking-wide";

interface Props {
  state: WizardState;
  errors: WizardErrors;
  onChange: (patch: Partial<WizardState>) => void;
}

export function Step4Amount({ state, errors, onChange }: Props) {
  const { action } = state;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-mute">
        {action === "apply_fee"
          ? "Set the fee. Points delta is also applied (default 0)."
          : "Set the points change applied to the sub."}
      </p>

      {action === "apply_fee" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ feeMode: "flat" })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                state.feeMode === "flat"
                  ? "border-accent bg-accent-trace text-accent-deep"
                  : "border-line text-text-mute hover:border-accent/40",
              )}
              aria-pressed={state.feeMode === "flat"}
            >
              Flat (£ GBP)
            </button>
            <button
              type="button"
              onClick={() => onChange({ feeMode: "percent" })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                state.feeMode === "percent"
                  ? "border-accent bg-accent-trace text-accent-deep"
                  : "border-line text-text-mute hover:border-accent/40",
              )}
              aria-pressed={state.feeMode === "percent"}
            >
              Percentage (%)
            </button>
          </div>

          {state.feeMode === "flat" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="wizard-fee-amount" className={labelCls}>
                Fee amount (£ GBP)
              </label>
              <input
                id="wizard-fee-amount"
                type="text"
                inputMode="decimal"
                value={state.feeAmount}
                onChange={(e) => onChange({ feeAmount: e.target.value })}
                placeholder="10.00"
                className={inputCls}
                aria-label="Fee amount in GBP"
              />
              {errors.feeAmount && <p className="text-xs text-bad-ink">{errors.feeAmount}</p>}
            </div>
          )}

          {state.feeMode === "percent" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="wizard-fee-percent" className={labelCls}>
                Fee percent (0–100)
              </label>
              <input
                id="wizard-fee-percent"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={state.feePercent}
                onChange={(e) => onChange({ feePercent: e.target.value })}
                placeholder="5"
                className={inputCls}
                aria-label="Fee percentage"
              />
              {errors.feePercent && <p className="text-xs text-bad-ink">{errors.feePercent}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="wizard-points" className={labelCls}>
          Points delta
          {action === "apply_points" && (
            <span className="normal-case font-normal text-accent-deep ml-1">*</span>
          )}
          {action === "notify_only" && (
            <span className="normal-case font-normal text-text-mute ml-1">(allow negative)</span>
          )}
        </label>
        <input
          id="wizard-points"
          type="number"
          step={1}
          value={state.pointsDelta}
          onChange={(e) => onChange({ pointsDelta: e.target.value })}
          placeholder="0"
          className={inputCls}
          aria-label="Points delta"
        />
        {errors.pointsDelta && <p className="text-xs text-bad-ink">{errors.pointsDelta}</p>}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-text-mute uppercase tracking-wide select-none list-none flex items-center gap-1">
          <span className="group-open:hidden">+ Advanced</span>
          <span className="hidden group-open:inline">− Advanced</span>
        </summary>
        <div className="mt-4 flex flex-col gap-4 border-l-2 border-line/50 pl-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="wizard-name" className={labelCls}>
              Name <span className="normal-case font-normal text-text-mute">(optional slug)</span>
            </label>
            <input
              id="wizard-name"
              type="text"
              maxLength={100}
              value={state.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="late_2d_notify"
              className={inputCls}
              aria-label="Rule name"
            />
            <p className="text-xs text-text-mute">Use a short slug, e.g. late_2d_notify</p>
            {errors.name && <p className="text-xs text-bad-ink">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="wizard-cooldown" className={labelCls}>
              Cooldown (hours)
            </label>
            <input
              id="wizard-cooldown"
              type="number"
              min={0}
              step={1}
              value={state.cooldownHours}
              onChange={(e) => onChange({ cooldownHours: e.target.value })}
              placeholder="24"
              className={inputCls}
              aria-label="Cooldown hours"
            />
            {errors.cooldownHours && <p className="text-xs text-bad-ink">{errors.cooldownHours}</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.active}
              onChange={(e) => onChange({ active: e.target.checked })}
              className="accent-[var(--color-accent)]"
              aria-label="Active"
            />
            <span className="text-sm text-text">Active (cron will consult this rule)</span>
          </label>
        </div>
      </details>
    </div>
  );
}
