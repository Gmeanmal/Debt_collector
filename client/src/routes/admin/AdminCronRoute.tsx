import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dryRunCronApi, applyCronApi, type CronRunSummaryOut } from "@/api/adminCron";
import { wasDryRunTooOld } from "@/services/admin/adminCronService";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DryRunResultCard } from "@/components/admin/cron/DryRunResultCard";
import { RunHistoryTable } from "@/components/admin/cron/RunHistoryTable";

interface DryRunState {
  result: CronRunSummaryOut;
  firedAt: Date;
}

export function AdminCronRoute() {
  const queryClient = useQueryClient();
  const [dryRun, setDryRun] = useState<DryRunState | null>(null);
  const nowRef = useRef<Date>(new Date());

  const dryRunMutation = useMutation<CronRunSummaryOut, Error>({
    mutationFn: dryRunCronApi,
    onSuccess: (result) => {
      const firedAt = new Date();
      nowRef.current = firedAt;
      setDryRun({ result, firedAt });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const applyMutation = useMutation<CronRunSummaryOut, Error & { status?: number }>({
    mutationFn: () => {
      if (!dryRun) throw new Error("No dry-run result");
      return applyCronApi(dryRun.result.run_id);
    },
    onSuccess: () => {
      toast.success("Cron applied");
      setDryRun(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.cronRuns() });
    },
    onError: (err) => {
      if (err.status === 409) {
        toast.error(err.message);
      } else {
        toast.error("Apply failed. Try running a fresh dry-run.");
      }
    },
  });

  const now = new Date();
  const dryRunExpired = dryRun !== null && wasDryRunTooOld(dryRun.result.started_at, now);
  const hasErrors = (dryRun?.result.errors?.length ?? 0) > 0;
  const applyEnabled = dryRun !== null && !dryRunExpired && !hasErrors;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
          Cron management
        </h1>
        <p className="text-sm text-base-text-muted mt-1">
          Manually trigger the daily cron job with a mandatory dry-run gate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run cron now</CardTitle>
          <CardDescription>
            Dry-run freezes all writes and rolls back. Confirm &amp; apply runs it for real within
            5 minutes of a clean dry-run.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              variant="primary"
              size="md"
              aria-label="Run dry-run"
              disabled={dryRunMutation.isPending || applyMutation.isPending}
              onClick={() => dryRunMutation.mutate()}
            >
              {dryRunMutation.isPending ? "Running…" : "Run dry-run"}
            </Button>

            <Button
              variant="secondary"
              size="md"
              aria-label="Confirm and apply cron"
              disabled={!applyEnabled || applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending ? "Applying…" : "Confirm & apply"}
            </Button>
          </div>

          {dryRunExpired && (
            <p className="text-xs text-base-text-muted">
              Dry-run expired, run it again.
            </p>
          )}

          {dryRun && !dryRunExpired && (
            <DryRunResultCard result={dryRun.result} />
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run history</CardTitle>
          <CardDescription>Last 50 cron runs — click a row to expand details.</CardDescription>
        </CardHeader>
        <CardContent>
          <RunHistoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
