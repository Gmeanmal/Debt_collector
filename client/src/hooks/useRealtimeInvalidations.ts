import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface PaymentDeclaredPayload {
  declaration_id: string;
  sub_username: string;
  amount: number | string;
  category: string;
}

interface ValidationResolvedPayload {
  outcome: "validated" | "rejected";
  reason: string | null;
}

interface ContractStateChangePayload {
  contract_slug: string;
  new_state: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPaymentDeclared(value: unknown): value is PaymentDeclaredPayload {
  if (!isRecord(value)) return false;
  return (
    typeof value.declaration_id === "string" &&
    typeof value.sub_username === "string" &&
    (typeof value.amount === "number" || typeof value.amount === "string") &&
    typeof value.category === "string"
  );
}

function isValidationResolved(value: unknown): value is ValidationResolvedPayload {
  if (!isRecord(value)) return false;
  const outcome = value.outcome;
  if (outcome !== "validated" && outcome !== "rejected") return false;
  return value.reason === null || typeof value.reason === "string";
}

function isContractStateChange(value: unknown): value is ContractStateChangePayload {
  if (!isRecord(value)) return false;
  return typeof value.contract_slug === "string" && typeof value.new_state === "string";
}

export interface RealtimeInvalidations {
  route: (type: string, data: unknown) => void;
}

export function useRealtimeInvalidations(qc: QueryClient): RealtimeInvalidations {
  function route(type: string, data: unknown): void {
    if (type === "payment_declared" && isPaymentDeclared(data)) {
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingValidations() });
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.dashboardSummary() });
      return;
    }
    if (type === "validation_resolved" && isValidationResolved(data)) {
      void qc.invalidateQueries({ queryKey: queryKeys.sub.payments() });
      void qc.invalidateQueries({ queryKey: queryKeys.sub.dashboardSummary() });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      return;
    }
    if (type === "contract_state_change" && isContractStateChange(data)) {
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.contracts() });
      void qc.invalidateQueries({ queryKey: queryKeys.sub.contracts() });
      void qc.invalidateQueries({ queryKey: queryKeys.contracts.bySlug(data.contract_slug) });
      return;
    }
  }

  return { route };
}
