import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPendingPaymentsApi,
  rejectDeclarationApi,
  validateDeclarationApi,
  type PaymentCategory,
  type PaymentOut,
} from "@/services/payments/paymentsApi";

const CATEGORIES: PaymentCategory[] = ["entry", "tribute"];

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

interface RejectModalProps {
  decl: PaymentOut;
  onClose: () => void;
}

function RejectModal({ decl, onClose }: RejectModalProps) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const rejectMutation = useMutation({
    mutationFn: () => rejectDeclarationApi(decl.id, { reason: reason || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingPayments"] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-bg/80 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-base-surface border border-base-border rounded-lg w-full max-w-sm p-6 shadow-[var(--shadow-card)] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-base-text">Reject declaration</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-base-text-muted">
          £{Number(decl.amount).toFixed(2)} — {decl.sub_display_name ?? "sub"}
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text">
            Reason <span className="text-base-text-subtle font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-debt-primary"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            className="px-3 py-1.5 text-sm bg-debt-primary text-pink-foreground font-semibold rounded hover:bg-debt-primary-hover transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
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
  } = useQuery({
    queryKey: ["pendingPayments"],
    queryFn: listPendingPaymentsApi,
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, cat }: { id: string; cat: string }) =>
      validateDeclarationApi(id, {
        recategorize_to: cat ? (cat as PaymentCategory) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingPayments"] }),
  });

  function setRecategory(id: string, val: string) {
    setRows((prev) => ({ ...prev, [id]: val }));
  }

  return (
    <div className="min-h-screen bg-base-bg p-4 md:p-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Pending Validations
        </h1>

        {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
        {isError && <p className="text-status-danger text-sm">Failed to load.</p>}

        {!isLoading && !isError && pending.length === 0 && (
          <p className="text-base-text-muted text-sm">No pending declarations.</p>
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
                  <p className="text-xs text-base-text-muted capitalize mt-0.5">
                    {p.category.replace(/_/g, " ")} · {formatDate(p.declared_at)}
                    {p.method_name && ` · ${p.method_name}`}
                  </p>
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
                      onClick={() => validateMutation.mutate({ id: p.id, cat: rows[p.id] ?? "" })}
                      disabled={validateMutation.isPending}
                      className="px-3 py-1 text-xs bg-status-success/20 text-status-success border border-status-success/30 rounded font-semibold hover:bg-status-success/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-status-success"
                    >
                      Validate
                    </button>
                    <button
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

      {rejectTarget && <RejectModal decl={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  );
}
