import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PunishmentTierForm } from "@/components/merits/PunishmentTierForm";
import {
  updateGoddessPunishment,
  deleteGoddessPunishment,
  invokeGoddessPunishment,
  type PunishmentTier,
  type PunishmentTierIn,
  goddessPunishmentsKey,
} from "@/services/merits/meritsApi";
import type { GoddessSub } from "@/services/payments/paymentsApi";

interface Props {
  tiers: PunishmentTier[];
  subs?: GoddessSub[];
}

interface EditState {
  tierId: string;
  error: string | null;
}

interface InvokeState {
  tierId: string;
  subId: string;
  error: string | null;
}

export function PunishmentTierList({ tiers, subs = [] }: Props) {
  const qc = useQueryClient();
  const [editState, setEditState] = useState<EditState | null>(null);
  const [invokeState, setInvokeState] = useState<InvokeState | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PunishmentTierIn }) =>
      updateGoddessPunishment(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessPunishmentsKey] });
      setEditState(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setEditState((s) => (s ? { ...s, error: msg } : null));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoddessPunishment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...goddessPunishmentsKey] });
    },
  });

  const invokeMutation = useMutation({
    mutationFn: ({ punishmentId, subId }: { punishmentId: string; subId: string }) =>
      invokeGoddessPunishment(punishmentId, subId),
    onSuccess: () => {
      setInvokeState(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to invoke";
      setInvokeState((s) => (s ? { ...s, error: msg } : null));
    },
  });

  if (tiers.length === 0) {
    return (
      <EmptyState title="No punishment tiers yet" message="Create one to invoke against subs." />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {tiers.map((tier) => {
        const isEditing = editState?.tierId === tier.id;
        const isInvoking = invokeState?.tierId === tier.id;

        return (
          <li
            key={tier.id}
            className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3"
          >
            {isEditing ? (
              <PunishmentTierForm
                initial={tier}
                onSubmit={(values) =>
                  updateMutation.mutate({ id: tier.id, payload: values })
                }
                onCancel={() => setEditState(null)}
                isPending={updateMutation.isPending}
                error={editState.error}
              />
            ) : isInvoking ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-base-text">
                  Invoke &ldquo;{tier.name}&rdquo; against:
                </p>
                <select
                  value={invokeState.subId}
                  onChange={(e) =>
                    setInvokeState((s) => (s ? { ...s, subId: e.target.value } : null))
                  }
                  className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
                  aria-label="Select sub to invoke punishment against"
                >
                  <option value="">Select a sub</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name} (@{s.username})
                    </option>
                  ))}
                </select>
                {invokeState.error && (
                  <p className="text-xs text-status-danger">{invokeState.error}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInvokeState(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!invokeState.subId || invokeMutation.isPending}
                    onClick={() =>
                      invokeMutation.mutate({
                        punishmentId: tier.id,
                        subId: invokeState.subId,
                      })
                    }
                    aria-label={`Confirm invoke ${tier.name}`}
                  >
                    {invokeMutation.isPending ? "Invoking…" : "Confirm invoke"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold text-base-text">{tier.name}</span>
                    {tier.description && (
                      <span className="text-xs text-base-text-muted">{tier.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={tier.active ? "warning" : "default"}>
                      {tier.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="danger">
                      {tier.default_points_penalty} pts
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditState({ tierId: tier.id, error: null })}
                    aria-label={`Edit ${tier.name}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(tier.id)}
                    aria-label={`Delete ${tier.name}`}
                  >
                    Delete
                  </Button>
                  {tier.active && subs.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setInvokeState({ tierId: tier.id, subId: "", error: null })
                      }
                      aria-label={`Invoke ${tier.name} for sub`}
                    >
                      Invoke
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
