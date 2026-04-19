import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
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
import { listGoddessSubsApi } from "@/services/payments/paymentsApi";
import { queryKeys } from "@/lib/queryKeys";

export function PenaltyRulesRoute() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const {
    data: rules = [],
    isLoading,
    isError,
    error,
  } = useQuery({
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
        <PageHeader
          crumbs={["Home · Rules · Penalties"]}
          title={<span className="italic">Penalty rules</span>}
          description="The cron engine consults these rules whenever a trigger fires (missed ritual, late rolling, missed task, or missed contract). Each rule can notify, deduct points, or record a fee — subject to its cooldown window."
        />

        <section className="flex flex-col gap-4">
          <SectionTitle
            title="Active rules"
            actions={
              !showForm ? (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  + New rule
                </Button>
              ) : undefined
            }
          />

          {showForm && (
            <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
              <PenaltyRuleForm
                subs={subs}
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

          {!isLoading && !isError && <PenaltyRuleList rules={rules} subs={subs} />}
        </section>
      </div>
    </div>
  );
}
