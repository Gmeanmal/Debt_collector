import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";
import {
  cancelDeclarationApi,
  editDeclarationApi,
  listMyPaymentsApi,
  listSubPaymentMethodsApi,
  type DeclarationSource,
  type PaymentOut,
} from "@/services/payments/paymentsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
  ingested: "Auto-ingested",
};

type BadgeTone = "pink" | "ink" | "neutral";

const SOURCE_TONE: Record<DeclarationSource, BadgeTone> = {
  sub_declared: "pink",
  goddess_recorded: "ink",
  ingested: "neutral",
};

type StatusTone = "warn" | "ok" | "bad" | "neutral";

const STATUS_TONE: Record<string, StatusTone> = {
  pending: "warn",
  validated: "ok",
  rejected: "bad",
  cancelled: "neutral",
};

function formatDate(dt: string) {
  return formatLondon(dt, "datetime");
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
        <label className="text-sm font-medium text-text" htmlFor="edit-amount">
          Amount (£)
        </label>
        <input
          id="edit-amount"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-bg-sunken border border-line rounded px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="edit-method">
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
                    ? "border-accent bg-accent-trace"
                    : "border-line hover:border-line-strong hover:bg-bg-sunken",
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
                  <p className="text-sm font-semibold text-text truncate">{m.name}</p>
                  <p className="text-xs text-text-mute truncate">{METHOD_LABELS[m.type]}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text" htmlFor="edit-note">
          Note
        </label>
        <input
          id="edit-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-bg-sunken border border-line rounded px-3 py-2 text-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => editMutation.mutate()}
          disabled={editMutation.isPending}
        >
          Save
        </Button>
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
        <PageHeader
          crumbs={["Home · Money · History"]}
          title="Payment History"
          actions={
            <Button type="button" variant="primary" onClick={() => navigate("/sub/payments/new")}>
              Declare payment
            </Button>
          }
        />

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

        {!isLoading && !isError && payments.length > 0 && (
          <div className="bg-bg-elev border border-line rounded-[10px] overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-sunken">
                <tr>
                  <th className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint px-3 py-2 text-left">
                    Amount
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint px-3 py-2 text-left">
                    Status
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint px-3 py-2 text-left">
                    Source
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint px-3 py-2 text-left hidden sm:table-cell">
                    Method
                  </th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint px-3 py-2 text-left hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-sunken/50 transition-colors">
                    <td className="px-3 py-3">
                      <span className="font-semibold text-text text-sm">{formatGBP(p.amount)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={SOURCE_TONE[p.source as DeclarationSource] ?? "neutral"}>
                        {SOURCE_LABEL[p.source as DeclarationSource] ?? p.source}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      {p.method_name && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-text-mute">
                          {p.method_type && <MethodIcon type={p.method_type} size="sm" />}
                          {p.method_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs text-text-faint">{formatDate(p.declared_at)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {p.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(p)}
                              aria-label="Edit declaration"
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => cancelMutation.mutate(p.id)}
                              aria-label="Cancel declaration"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {p.status === "rejected" && p.rejection_reason && (
                          <p className="text-xs text-bad-ink">Rejected: {p.rejection_reason}</p>
                        )}
                        {p.note && <p className="text-xs text-text-faint italic">{p.note}</p>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditModal decl={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
