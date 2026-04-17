import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { GoddessSub } from "@/services/payments/paymentsApi";
import {
  PenaltyRuleInSchema,
  PenaltyTriggerSchema,
  PenaltyActionSchema,
  type PenaltyRule,
  type PenaltyRuleIn,
  type PenaltyTrigger,
  type PenaltyAction,
} from "@/services/penaltyRules/penaltyRulesApi";

interface Props {
  initial?: Partial<PenaltyRule>;
  subs?: GoddessSub[];
  onSubmit: (values: PenaltyRuleIn) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  contract_missed: "Contract missed",
  ritual_missed: "Ritual missed",
  rolling_late: "Rolling late",
  task_missed: "Task missed",
};

const ACTION_LABELS: Record<string, string> = {
  notify_only: "Notify only",
  apply_points: "Apply points",
  apply_fee: "Apply fee",
};

function fieldError(errors: Record<string, string>, field: string): string | undefined {
  return errors[field];
}

const inputCls =
  "bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary w-full";

const labelCls = "text-xs font-semibold text-base-text-muted uppercase tracking-wide";

export function PenaltyRuleForm({
  initial,
  subs = [],
  onSubmit,
  onCancel,
  isPending,
  error,
}: Props) {
  const [trigger, setTrigger] = useState<PenaltyTrigger>(initial?.trigger ?? "contract_missed");
  const [action, setAction] = useState<PenaltyAction>(initial?.action ?? "notify_only");
  const [pointsDelta, setPointsDelta] = useState(
    initial?.points_delta != null ? String(initial.points_delta) : "0",
  );
  const [feeAmount, setFeeAmount] = useState(initial?.fee_amount ?? "");
  const [cooldownHours, setCooldownHours] = useState(
    initial?.cooldown_hours != null ? String(initial.cooldown_hours) : "24",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const initialSub = subs.find((s) => s.id === initial?.sub_id) ?? null;
  const [selectedSub, setSelectedSub] = useState<GoddessSub | null>(initialSub);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showFeeField = action === "apply_fee";

  function validate(): PenaltyRuleIn | null {
    const result = PenaltyRuleInSchema.safeParse({
      trigger,
      action,
      points_delta: pointsDelta === "" ? 0 : Number(pointsDelta),
      fee_amount: feeAmount === "" ? undefined : feeAmount,
      cooldown_hours: cooldownHours === "" ? 0 : Number(cooldownHours),
      active,
      sub_id: selectedSub?.id ?? "",
    });
    if (!result.success) {
      const map: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        map[key] = issue.message;
      }
      setErrors(map);
      return null;
    }
    setErrors({});
    return result.data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = validate();
    if (!values) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pr-trigger" className={labelCls}>
            Trigger
          </label>
          <select
            id="pr-trigger"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value as PenaltyTrigger)}
            className={inputCls}
          >
            {PenaltyTriggerSchema.options.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t] ?? t}
              </option>
            ))}
          </select>
          {fieldError(errors, "trigger") && (
            <p className="text-xs text-status-danger">{fieldError(errors, "trigger")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pr-action" className={labelCls}>
            Action
          </label>
          <select
            id="pr-action"
            value={action}
            onChange={(e) => setAction(e.target.value as PenaltyAction)}
            className={inputCls}
          >
            {PenaltyActionSchema.options.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
          {fieldError(errors, "action") && (
            <p className="text-xs text-status-danger">{fieldError(errors, "action")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pr-points" className={labelCls}>
            Points delta <span className="normal-case font-normal">(must be ≤ 0)</span>
          </label>
          <input
            id="pr-points"
            type="number"
            step={1}
            value={pointsDelta}
            onChange={(e) => setPointsDelta(e.target.value)}
            placeholder="-5"
            className={inputCls}
          />
          {fieldError(errors, "points_delta") && (
            <p className="text-xs text-status-danger">{fieldError(errors, "points_delta")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pr-cooldown" className={labelCls}>
            Cooldown (hours)
          </label>
          <input
            id="pr-cooldown"
            type="number"
            min={0}
            step={1}
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            placeholder="24"
            className={inputCls}
          />
          {fieldError(errors, "cooldown_hours") && (
            <p className="text-xs text-status-danger">{fieldError(errors, "cooldown_hours")}</p>
          )}
        </div>
      </div>

      {showFeeField && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pr-fee" className={labelCls}>
            Fee amount (£ GBP)
          </label>
          <input
            id="pr-fee"
            type="text"
            inputMode="decimal"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="10.00"
            className={inputCls}
          />
          {fieldError(errors, "fee_amount") && (
            <p className="text-xs text-status-danger">{fieldError(errors, "fee_amount")}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className={labelCls}>
          Sub override <span className="normal-case font-normal">(leave blank for all subs)</span>
        </span>
        <SearchableSelect<GoddessSub>
          options={subs}
          value={selectedSub}
          onChange={setSelectedSub}
          getLabel={(s) => `${s.display_name} @${s.username}`}
          getValue={(s) => s.id}
          placeholder="All subs (no override)"
          emptyMessage="No active subs"
          nullable
          renderOption={(s) => (
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium text-base-text">{s.display_name}</span>
                <span className="block truncate text-xs text-base-text-muted">@{s.username}</span>
              </span>
            </span>
          )}
        />
        {fieldError(errors, "sub_id") && (
          <p className="text-xs text-status-danger">{fieldError(errors, "sub_id")}</p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-pink-primary"
          aria-label="Active"
        />
        <span className="text-sm text-base-text">Active (cron will consult this rule)</span>
      </label>

      {error && <p className="text-xs text-status-danger">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
