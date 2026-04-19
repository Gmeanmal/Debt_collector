import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmActionModal } from "@/components/shared/ConfirmActionModal";
import { PenaltyRuleForm } from "@/components/penaltyRules/PenaltyRuleForm";
import {
  editPenaltyRule,
  removePenaltyRule,
  penaltyRulesKey,
  type PenaltyRule,
  type PenaltyRuleIn,
} from "@/services/penaltyRules/penaltyRulesApi";
import type { GoddessSub } from "@/services/payments/paymentsApi";
import { formatGBP } from "@/services/format/currency";

interface Props {
  rules: PenaltyRule[];
  subs?: GoddessSub[];
}

interface EditState {
  ruleId: string;
  error: string | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  contract_missed: "Contract missed",
  ritual_missed: "Ritual missed",
  rolling_late: "Rolling late",
  task_missed: "Task missed",
};

const ACTION_LABELS: Record<string, string> = {
  notify_only: "Notify only",
  apply_points: "Apply points",
  apply_fee: "Apply fee",
};

function triggerDescription(rule: PenaltyRule): string {
  if (rule.trigger === "rolling_late" && rule.min_days_late != null) {
    return `Rolling late · ≥ ${rule.min_days_late} days`;
  }
  return TRIGGER_LABELS[rule.trigger] ?? rule.trigger;
}

function feeDisplay(rule: PenaltyRule): string | null {
  if (rule.fee_amount != null) return formatGBP(rule.fee_amount);
  if (rule.fee_percent != null) return `${Number(rule.fee_percent)} %`;
  return null;
}

function ActionBadge({ action }: { action: string }) {
  const variant =
    action === "apply_fee" ? "danger" : action === "apply_points" ? "warning" : "default";
  return <Badge variant={variant}>{ACTION_LABELS[action] ?? action}</Badge>;
}

export function PenaltyRuleList({ rules, subs = [] }: Props) {
  const qc = useQueryClient();
  const [editState, setEditState] = useState<EditState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PenaltyRuleIn }) =>
      editPenaltyRule(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...penaltyRulesKey] });
      setEditState(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to update rule";
      setEditState((s) => (s ? { ...s, error: msg } : null));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removePenaltyRule(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...penaltyRulesKey] });
      setConfirmDeleteId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      editPenaltyRule(id, { active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...penaltyRulesKey] });
    },
  });

  const ruleToDelete = rules.find((r) => r.id === confirmDeleteId);

  if (rules.length === 0) {
    return (
      <EmptyState
        title="No penalty rules yet"
        message="Create a rule to let the cron engine respond to missed obligations."
      />
    );
  }

  return (
    <>
      {confirmDeleteId && ruleToDelete && (
        <ConfirmActionModal
          kind="simple"
          title="Delete penalty rule"
          description={
            <span>
              Delete rule{" "}
              <strong className="text-text">
                {ruleToDelete.name ?? TRIGGER_LABELS[ruleToDelete.trigger]}
              </strong>
              ? This cannot be undone.
            </span>
          }
          confirmLabel="Delete"
          isDestructive
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDeleteId)}
          onClose={() => setConfirmDeleteId(null)}
          error={deleteMutation.error instanceof Error ? deleteMutation.error.message : null}
        />
      )}

      <div className="overflow-x-auto rounded-[10px] border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-sunken">
              <th className="px-4 py-3 text-left font-medium text-text-mute">Name</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Trigger</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Action</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Points Δ</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Fee</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Cooldown (h)</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Sub</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Active</th>
              <th className="px-4 py-3 text-left font-medium text-text-mute">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const isEditing = editState?.ruleId === rule.id;
              if (isEditing) {
                return (
                  <tr key={rule.id}>
                    <td colSpan={9} className="px-4 py-4">
                      <PenaltyRuleForm
                        initial={rule}
                        subs={subs}
                        onSubmit={(values) =>
                          updateMutation.mutate({ id: rule.id, payload: values })
                        }
                        onCancel={() => setEditState(null)}
                        isPending={updateMutation.isPending}
                        error={editState.error}
                      />
                    </td>
                  </tr>
                );
              }

              const fee = feeDisplay(rule);

              return (
                <tr
                  key={rule.id}
                  className="border-b border-line/50 hover:bg-bg-sunken/50 transition-colors"
                >
                  <td className="px-4 py-3 text-text-mute text-xs">
                    {rule.name ?? <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    {triggerDescription(rule)}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={rule.action} />
                  </td>
                  <td className="px-4 py-3 text-text">
                    {rule.points_delta !== 0 ? (
                      <span className="font-mono text-bad-ink">{rule.points_delta}</span>
                    ) : (
                      <span className="text-text-mute">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {fee != null ? fee : <span className="text-text-mute">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text">{rule.cooldown_hours}</td>
                  <td className="px-4 py-3 text-text-mute text-xs">
                    {rule.sub_id == null
                      ? "All subs"
                      : (() => {
                          const sub = subs.find((s) => s.id === rule.sub_id);
                          return sub ? (
                            <span>
                              {sub.display_name}{" "}
                              <span className="text-text-mute">@{sub.username}</span>
                            </span>
                          ) : (
                            <span className="italic">scoped</span>
                          );
                        })()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: rule.id, active: !rule.active })}
                      disabled={toggleMutation.isPending}
                      aria-label={rule.active ? "Deactivate rule" : "Activate rule"}
                      className="focus-visible:ring-2 focus-visible:ring-accent rounded"
                    >
                      <Badge variant={rule.active ? "success" : "default"}>
                        {rule.active ? "On" : "Off"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditState({ ruleId: rule.id, error: null })}
                        aria-label="Edit rule"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDeleteId(rule.id)}
                        aria-label="Delete rule"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
