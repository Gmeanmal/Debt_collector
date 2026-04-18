import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GoddessSub } from "@/services/payments/paymentsApi";
import {
  type PenaltyAction,
  type PenaltyRule,
  type PenaltyRuleIn,
  type PenaltyTrigger,
} from "@/services/penaltyRules/penaltyRulesApi";
import { Step1Trigger } from "./wizard/Step1Trigger";
import { Step2Condition } from "./wizard/Step2Condition";
import { Step3Action } from "./wizard/Step3Action";
import { Step4Amount } from "./wizard/Step4Amount";
import type { WizardErrors, WizardState } from "./wizard/types";

interface Props {
  initial?: Partial<PenaltyRule>;
  subs?: GoddessSub[];
  onSubmit: (values: PenaltyRuleIn) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

const STEP_HEADERS = [
  "1 / 4 · Trigger",
  "2 / 4 · Condition",
  "3 / 4 · Action",
  "4 / 4 · Amount",
];

function initialFeeMode(rule?: Partial<PenaltyRule>): "flat" | "percent" {
  if (rule?.fee_percent != null) return "percent";
  return "flat";
}

function buildInitialState(initial: Partial<PenaltyRule> | undefined, subs: GoddessSub[]): WizardState {
  const sub = subs.find((s) => s.id === initial?.sub_id) ?? null;
  return {
    trigger: (initial?.trigger as PenaltyTrigger | undefined) ?? "contract_missed",
    minDaysLate: initial?.min_days_late != null ? String(initial.min_days_late) : "",
    selectedSub: sub,
    action: (initial?.action as PenaltyAction | undefined) ?? "notify_only",
    feeMode: initialFeeMode(initial),
    pointsDelta: initial?.points_delta != null ? String(initial.points_delta) : "0",
    feeAmount: initial?.fee_amount ?? "",
    feePercent: initial?.fee_percent != null ? String(initial.fee_percent) : "",
    name: initial?.name ?? "",
    cooldownHours: initial?.cooldown_hours != null ? String(initial.cooldown_hours) : "24",
    active: initial?.active ?? true,
  };
}

const step1Schema = z.object({
  trigger: z.enum(["contract_missed", "ritual_missed", "rolling_late", "task_missed"]),
});

const step2Schema = z
  .object({
    trigger: z.enum(["contract_missed", "ritual_missed", "rolling_late", "task_missed"]),
    minDaysLate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.trigger === "rolling_late") {
      const n = parseInt(data.minDaysLate, 10);
      if (Number.isNaN(n) || n < 1 || n > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be between 1 and 90",
          path: ["minDaysLate"],
        });
      }
    }
  });

const step3Schema = z.object({
  action: z.enum(["notify_only", "apply_points", "apply_fee"]),
});

const step4Schema = z
  .object({
    action: z.enum(["notify_only", "apply_points", "apply_fee"]),
    feeMode: z.enum(["flat", "percent"]),
    pointsDelta: z.string(),
    feeAmount: z.string(),
    feePercent: z.string(),
    cooldownHours: z.string(),
  })
  .superRefine((data, ctx) => {
    const pts = parseInt(data.pointsDelta, 10);
    if (Number.isNaN(pts)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a whole number",
        path: ["pointsDelta"],
      });
    }
    if (data.action === "apply_points" && (Number.isNaN(pts) || pts > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be 0 or negative for a penalty",
        path: ["pointsDelta"],
      });
    }
    if (data.action === "apply_fee") {
      if (data.feeMode === "flat") {
        if (!/^\d+(\.\d{1,2})?$/.test(data.feeAmount)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be a valid GBP amount e.g. 10.00",
            path: ["feeAmount"],
          });
        }
      } else {
        const pct = parseFloat(data.feePercent);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be between 0 and 100",
            path: ["feePercent"],
          });
        }
      }
    }
    const cd = parseInt(data.cooldownHours, 10);
    if (Number.isNaN(cd) || cd < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be 0 or more",
        path: ["cooldownHours"],
      });
    }
  });

function buildPayload(state: WizardState): PenaltyRuleIn {
  const isRollingLate = state.trigger === "rolling_late";
  const payload: PenaltyRuleIn = {
    trigger: state.trigger,
    action: state.action,
    points_delta: parseInt(state.pointsDelta, 10) || 0,
    cooldown_hours: parseInt(state.cooldownHours, 10) || 0,
    active: state.active,
    sub_id: state.selectedSub?.id ?? "",
    name: state.name.trim() || undefined,
  };

  if (isRollingLate && state.minDaysLate !== "") {
    payload.min_days_late = parseInt(state.minDaysLate, 10);
  }

  if (state.action === "apply_fee") {
    if (state.feeMode === "flat") {
      payload.fee_amount = state.feeAmount;
    } else {
      payload.fee_percent = parseFloat(state.feePercent);
    }
  }

  return payload;
}

export function PenaltyRuleForm({ initial, subs = [], onSubmit, onCancel, isPending, error }: Props) {
  const [step, setStep] = useState(0);
  const [wizState, setWizState] = useState<WizardState>(() => buildInitialState(initial, subs));
  const [errors, setErrors] = useState<WizardErrors>({});

  function patchState(patch: Partial<WizardState>) {
    setWizState((s) => ({ ...s, ...patch }));
  }

  function validateStep(): boolean {
    setErrors({});
    const map: WizardErrors = {};

    let result: { success: boolean; error?: z.ZodError };
    if (step === 0) {
      result = step1Schema.safeParse({ trigger: wizState.trigger });
    } else if (step === 1) {
      result = step2Schema.safeParse({ trigger: wizState.trigger, minDaysLate: wizState.minDaysLate });
    } else if (step === 2) {
      result = step3Schema.safeParse({ action: wizState.action });
    } else {
      result = step4Schema.safeParse({
        action: wizState.action,
        feeMode: wizState.feeMode,
        pointsDelta: wizState.pointsDelta,
        feeAmount: wizState.feeAmount,
        feePercent: wizState.feePercent,
        cooldownHours: wizState.cooldownHours,
      });
    }

    if (!result.success && result.error) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        map[key] = issue.message;
      }
      setErrors(map);
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    onSubmit(buildPayload(wizState));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        {STEP_HEADERS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold",
                idx === step ? "text-pink-primary" : "text-base-text-muted",
              )}
            >
              {label}
            </span>
            {idx < STEP_HEADERS.length - 1 && (
              <span className="text-base-text-muted/40 text-xs">›</span>
            )}
          </div>
        ))}
      </div>

      <div>
        {step === 0 && (
          <Step1Trigger
            state={wizState}
            errors={errors}
            onChange={(trigger) => patchState({ trigger })}
          />
        )}
        {step === 1 && (
          <Step2Condition
            state={wizState}
            subs={subs}
            errors={errors}
            onMinDaysChange={(v) => patchState({ minDaysLate: v })}
            onSubChange={(sub) => patchState({ selectedSub: sub })}
          />
        )}
        {step === 2 && (
          <Step3Action
            state={wizState}
            errors={errors}
            onChange={(action) => patchState({ action })}
          />
        )}
        {step === 3 && (
          <Step4Amount state={wizState} errors={errors} onChange={patchState} />
        )}
      </div>

      {error && <p className="text-xs text-status-danger">{error}</p>}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={step === 0 ? onCancel : handleBack}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button type="button" size="sm" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save rule"}
          </Button>
        )}
      </div>
    </form>
  );
}
