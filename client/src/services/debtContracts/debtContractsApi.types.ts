import type { components } from "@/types/api.generated";

export type SurprisePenaltyPreviewOut = components["schemas"]["SurprisePenaltyPreviewOut"];
export type SurprisePenaltyCommitIn = components["schemas"]["SurprisePenaltyCommitIn"];
export type BuyoutPreviewOut = components["schemas"]["BuyoutPreviewOut"];
export type DebtContractCreate = components["schemas"]["DebtContractCreate"];
export type DebtContractCounter = components["schemas"]["DebtContractCounter"];
export type DebtContractSignIn = components["schemas"]["DebtContractSignIn"];
export type DebtContractOut = components["schemas"]["DebtContractOut"];
export type DebtContractVersionOut = components["schemas"]["DebtContractVersionOut"];
export type DebtContractAuditOut = components["schemas"]["DebtContractAuditOut"];
export type DebtSimulationOut = components["schemas"]["DebtSimulationOut"];
export type DebtSimulationPeriod = components["schemas"]["DebtSimulationPeriod"];
export type DebtContractStatus = components["schemas"]["DebtContractStatus"];
export type InterestPeriod = components["schemas"]["InterestPeriod"];
export type PaymentFrequency = components["schemas"]["PaymentFrequency"];
export type LatePenaltySeverity = components["schemas"]["LatePenaltySeverity"];
export type MidContractAdditionMode = components["schemas"]["MidContractAdditionMode"];
export type BuyoutIntentOut = components["schemas"]["BuyoutIntentOut"];
export type SurprisePenaltyIn = components["schemas"]["SurprisePenaltyIn"];
export type AdjustmentCreateIn = components["schemas"]["AdjustmentCreateIn"];
export type ContractAdjustmentOut = components["schemas"]["ContractAdjustmentOut"];
export type AdjustmentStatus = components["schemas"]["AdjustmentStatus"];
export type PaymentMethodOut = components["schemas"]["PaymentMethodOut"];

export interface GoddessContractFilters {
  status?: DebtContractStatus[];
  sub_id?: string;
  min_amount?: number;
  max_amount?: number;
}
