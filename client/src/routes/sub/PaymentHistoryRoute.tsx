import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelDeclarationApi,
  editDeclarationApi,
  listMyPaymentsApi,
  listSubPaymentMethodsApi,
  type DeclarationSource,
  type PaymentOut,
} from "@/services/payments/paymentsApi";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { METHOD_LABELS } from "@/components/paymentMethods/methodMetadata";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
};

type BadgeVariant = "default" | "primary" | "debt";

const SOURCE_VARIANT: Record<DeclarationSource, BadgeVariant> = {
  sub_declared: "default",
  goddess_recorded: "debt",
};

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
    queryKey: queryKeys.sub.paymentMethods(),
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
      qc.invalidateQueries({ queryKey: queryKeys.sub.payments() });
      onClose();
    },
  });

  return (
    <Modal title="Edit declaration" onClose={onClose}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="edit-amount">
          Amount (£)
        </label>
        <input
          id="edit-amount"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="edit-method">
          Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="edit-method">
          {methods.map((m) => {
            const selected = methodId === m.id;
            return (
              <label
                key={m.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                  selected
                    ? "border-pink-primary bg-pink-primary/10"
                    : "border-base-border hover:border-base-border/80 hover:bg-base-surface-raised",
                )}
              >
                <input
                  type="radio"
                  name="edit-method"
                  value={m.id}
                  checked={selected}
                  onChange={() => setMethodId(m.id)}
                  className="sr-only"
                />
                <MethodIcon type={m.type} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-base-text truncate">{m.name}</p>
                  <p className="text-xs text-base-text-muted truncate">{METHOD_LABELS[m.type]}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text" htmlFor="edit-note">
          Note
        </label>
        <input
          id="edit-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-base-text-muted border border-base-border rounded hover:text-base-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => editMutation.mutate()}
          disabled={editMutation.isPending}
          className="px-3 py-1.5 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </Modal>
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
    error,
  } = useQuery({
    queryKey: queryKeys.sub.payments(),
    queryFn: listMyPaymentsApi,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelDeclarationApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sub.payments() }),
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Payment History
          </h1>
          <button
            type="button"
            onClick={() => navigate("/sub/payments/new")}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded hover:bg-pink-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
          >
            Declare payment
          </button>
        </div>

        {isLoading && <ListSkeleton rows={3} />}
        {isError && (
          <ErrorState
            title="Failed to load payments"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && payments.length === 0 && (
          <EmptyState
            title="No payments declared yet"
            message="Declare your first tribute and it will show up here."
          />
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
                  <Badge variant={SOURCE_VARIANT[p.source as DeclarationSource] ?? "default"}>
                    {SOURCE_LABEL[p.source as DeclarationSource] ?? p.source}
                  </Badge>
                </div>

                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label="Edit declaration"
                      className="text-xs text-base-text-muted hover:text-base-text px-2 py-1 rounded border border-base-border transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(p.id)}
                      aria-label="Cancel declaration"
                      className="text-xs text-status-danger hover:text-debt-primary-hover px-2 py-1 rounded border border-debt-muted transition-colors focus-visible:ring-2 focus-visible:ring-debt-primary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-base-text-muted flex gap-3 flex-wrap items-center">
                <span>{formatDate(p.declared_at)}</span>
                {p.method_name && (
                  <span className="inline-flex items-center gap-1.5">
                    {p.method_type && <MethodIcon type={p.method_type} size="sm" />}
                    {p.method_name}
                  </span>
                )}
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
