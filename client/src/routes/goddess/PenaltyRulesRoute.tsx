import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PenaltyRuleForm } from "@/components/penaltyRules/PenaltyRuleForm";
import { PenaltyRuleList } from "@/components/penaltyRules/PenaltyRuleList";
import {
  listPenaltyRules,
  addPenaltyRule,
  penaltyRulesKey,
  type PenaltyRuleIn,
} from "@/services/penaltyRules/penaltyRulesApi";

export function PenaltyRulesRoute() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: rules = [], isLoading, isError, error } = useQuery({
    queryKey: [...penaltyRulesKey],
    queryFn: listPenaltyRules,
  });

  const createMutation = useMutation({
    mutationFn: (payload: PenaltyRuleIn) => addPenaltyRule(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...penaltyRulesKey] });
      setShowForm(false);
      setCreateError(null);
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : "Failed to create rule");
    },
  });

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            Automation
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl italic leading-none text-base-text">
            Penalty rules.
          </h1>
          <p className="mt-3 text-sm text-base-text-muted max-w-xl">
            The cron engine consults these rules whenever a trigger fires (missed ritual, late
            rolling, missed task, or missed contract). Each rule can notify, deduct points, or
            record a fee — subject to its cooldown window.
          </p>
        </header>

        <Separator />

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-base-text">Active rules</h2>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                + New rule
              </Button>
            )}
          </div>

          {showForm && (
            <div className="bg-base-surface border border-base-border rounded-lg p-4">
              <PenaltyRuleForm
                onSubmit={(values) => createMutation.mutate(values)}
                onCancel={() => {
                  setShowForm(false);
                  setCreateError(null);
                }}
                isPending={createMutation.isPending}
                error={createError}
              />
            </div>
          )}

          {isLoading && <ListSkeleton rows={4} />}

          {isError && (
            <ErrorState
              title="Failed to load penalty rules"
              message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
            />
          )}

          {!isLoading && !isError && <PenaltyRuleList rules={rules} />}
        </section>
      </div>
    </div>
  );
}
