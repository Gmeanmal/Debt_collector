import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPendingPaymentsApi,
  rejectDeclarationApi,
  validateDeclarationApi,
  type DeclarationSource,
  type PaymentCategory,
  type PaymentOut,
} from "@/services/payments/paymentsApi";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { RejectModal } from "@/components/shared/RejectModal";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { queryKeys } from "@/lib/queryKeys";

const CATEGORIES: PaymentCategory[] = ["entry", "tribute"];

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
  ingested: "Auto-ingested",
};

type BadgeVariant = "default" | "primary" | "debt";

const SOURCE_VARIANT: Record<DeclarationSource, BadgeVariant> = {
  sub_declared: "default",
  goddess_recorded: "debt",
  ingested: "default",
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

interface RejectPanelProps {
  decl: PaymentOut;
  onClose: () => void;
}

function RejectPanel({ decl, onClose }: RejectPanelProps) {
  const qc = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectDeclarationApi(decl.id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() });
      onClose();
    },
  });

  const description = `£${Number(decl.amount).toFixed(2)} — ${decl.sub_display_name ?? "sub"}`;

  return (
    <RejectModal
      title="Reject declaration"
      description={description}
      onClose={onClose}
      onConfirm={(reason) => rejectMutation.mutateAsync(reason)}
    />
  );
}

export function PendingValidationsRoute() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<PaymentOut | null>(null);
  const [rows, setRows] = useState<Record<string, string>>({});

  const {
    data: pending = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.pendingPayments(),
    queryFn: listPendingPaymentsApi,
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, cat }: { id: string; cat: string }) =>
      validateDeclarationApi(id, {
        recategorize_to: cat ? (cat as PaymentCategory) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goddess.pendingPayments() }),
  });

  function setRecategory(id: string, val: string) {
    setRows((prev) => ({ ...prev, [id]: val }));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Pending Validations
        </h1>

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load pending payments"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && pending.length === 0 && (
          <EmptyState
            title="No pending declarations"
            message="When subs declare payments, they will appear here for you to approve."
          />
        )}

        {validateMutation.isError && (
          <ErrorState
            title="Validation failed"
            message={(validateMutation.error as Error | undefined)?.message ?? "Validation failed"}
          />
        )}

        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-base-text text-sm">
                    {p.sub_display_name ?? "Sub"} — £{Number(p.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-base-text-muted capitalize mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
                    <span>
                      {p.category.replace(/_/g, " ")} · {formatDate(p.declared_at)}
                    </span>
                    {p.method_name && (
                      <span className="inline-flex items-center gap-1.5">
                        ·{p.method_type && <MethodIcon type={p.method_type} size="sm" />}
                        {p.method_name}
                      </span>
                    )}
                  </p>
                  <Badge
                    variant={SOURCE_VARIANT[p.source as DeclarationSource] ?? "default"}
                    className="mt-1"
                  >
                    {SOURCE_LABEL[p.source as DeclarationSource] ?? p.source}
                  </Badge>
                  {p.note && <p className="text-xs text-base-text-subtle italic mt-1">{p.note}</p>}
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <select
                    value={rows[p.id] ?? ""}
                    onChange={(e) => setRecategory(p.id, e.target.value)}
                    aria-label="Recategorise before validating"
                    className="bg-base-surface-raised border border-base-border rounded px-2 py-1 text-xs text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
                  >
                    <option value="">Keep category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        → {c.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => validateMutation.mutate({ id: p.id, cat: rows[p.id] ?? "" })}
                      disabled={validateMutation.isPending}
                      className="px-3 py-1 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
                    >
                      Validate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectTarget(p)}
                      className="px-3 py-1 text-xs bg-debt-muted text-status-danger border border-debt-ring rounded font-semibold hover:bg-debt-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rejectTarget && <RejectPanel decl={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  );
}
