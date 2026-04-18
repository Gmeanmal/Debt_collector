import type { PenaltyAction, PenaltyTrigger } from "@/services/penaltyRules/penaltyRulesApi";
import type { GoddessSub } from "@/services/payments/paymentsApi";

export interface WizardState {
  trigger: PenaltyTrigger;
  minDaysLate: string;
  selectedSub: GoddessSub | null;
  action: PenaltyAction;
  feeMode: "flat" | "percent";
  pointsDelta: string;
  feeAmount: string;
  feePercent: string;
  name: string;
  cooldownHours: string;
  active: boolean;
}

export type WizardErrors = Record<string, string>;
