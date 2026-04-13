import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelDeclarationApi,
  editDeclarationApi,
  listMyPaymentsApi,
  listSubPaymentMethodsApi,
  type PaymentOut,
} from "@/services/payments/paymentsApi";

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  validated: "bg-status-success/20 text-status-success",
  rejected: "bg-debt-muted text-status-danger",
  cancelled: "bg-base-surface-raised text-base-text-muted",
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface EditModalProps {
  decl: PaymentOut;
  onClose: () => void;
}

function EditModal({ decl, onClose }: EditModalProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(decl.amount));
  const [note, setNote] = useState(decl.note ?? "");

  const { data: methods = [] } = useQuery({
    queryKey: ["subPaymentMethods"],
    queryFn: listSubPaymentMethodsApi,
  });

  const [methodId, setMethodId] = useState(decl.method_id);

  const editMutation = useMutation({
    mutationFn: () =>
      editDeclarationApi(decl.id, {
        amount: Number(amount) as unknown as string & number,
        method_id: methodId,
        note: note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPayments"] });
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
          <h2 className="text-base font-semibold text-base-text">Edit declaration</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-base-text-muted hover:text-base-text focus-visible:ring-2 focus-visible:ring-pink-primary rounded"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text">Amount (£)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text">Method</label>
          <select
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-base-text">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
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
            onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending}
            className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentHistoryRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PaymentOut | null>(null);

  const {
    data: payments = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["myPayments"],
    queryFn: listMyPaymentsApi,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelDeclarationApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPayments"] }),
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Payment History
          </h1>
          <button
            onClick={() => navigate("/sub/payments/new")}
            className="px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            Declare payment
          </button>
        </div>

        {isLoading && <p className="text-base-text-muted text-sm">Loading…</p>}
        {isError && <p className="text-status-danger text-sm">Failed to load payments.</p>}

        {!isLoading && !isError && payments.length === 0 && (
          <p className="text-base-text-muted text-sm">No payments declared yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base-text text-sm">
                    £{Number(p.amount).toFixed(2)}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CHIP[p.status] ?? ""}`}
                  >
                    {p.status}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-base-surface-raised text-base-text-muted capitalize">
                    {p.category.replace(/_/g, " ")}
                  </span>
                </div>

                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(p)}
                      aria-label="Edit declaration"
                      className="text-xs text-base-text-muted hover:text-base-text px-2 py-1 rounded border border-base-border transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(p.id)}
                      aria-label="Cancel declaration"
                      className="text-xs text-status-danger hover:text-debt-primary-hover px-2 py-1 rounded border border-debt-muted transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-base-text-muted flex gap-3 flex-wrap">
                <span>{formatDate(p.declared_at)}</span>
                {p.method_name && <span>{p.method_name}</span>}
                {p.note && <span className="italic">{p.note}</span>}
              </div>

              {p.status === "rejected" && p.rejection_reason && (
                <p className="text-xs text-status-danger">Rejected: {p.rejection_reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && <EditModal decl={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
