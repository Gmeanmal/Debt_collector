import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { runProofJanitorApi, type ProofJanitorOut } from "@/api/adminJanitor";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

function ResultPanel({ result }: { result: ProofJanitorOut }) {
  const label = result.dry_run ? "would delete" : "deleted";
  return (
    <div
      className="rounded-md border border-line bg-bg-elev px-4 py-3 text-sm flex flex-col gap-1"
      role="status"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-text">
          {result.dry_run ? "Dry-run complete" : "Janitor applied"}
        </span>
        {result.batch_capped && (
          <span className="text-xs text-status-warning">Batch cap reached — rerun to continue</span>
        )}
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-text-mute">
        <div>
          <dt className="inline">Scanned: </dt>
          <dd className="inline tabular-nums">{result.scanned}</dd>
        </div>
        <div>
          <dt className="inline">Referenced: </dt>
          <dd className="inline tabular-nums">{result.referenced}</dd>
        </div>
        <div>
          <dt className="inline">Orphans: </dt>
          <dd className="inline tabular-nums">{result.orphan_candidates}</dd>
        </div>
        <div>
          <dt className="inline">Within grace: </dt>
          <dd className="inline tabular-nums">{result.within_grace}</dd>
        </div>
        <div className="col-span-2 md:col-span-4">
          <dt className="inline">{label}: </dt>
          <dd className="inline font-semibold text-text tabular-nums">{result.deleted}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ProofJanitorCard() {
  const [lastResult, setLastResult] = useState<ProofJanitorOut | null>(null);

  const dryRunMutation = useMutation({
    mutationFn: () => runProofJanitorApi(true),
    onSuccess: (data) => setLastResult(data),
    onError: (err: Error) => toast.error(err.message),
  });

  const applyMutation = useMutation({
    mutationFn: () => runProofJanitorApi(false),
    onSuccess: (data) => {
      setLastResult(data);
      toast.success(`Janitor deleted ${data.deleted} orphan${data.deleted === 1 ? "" : "s"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = dryRunMutation.isPending || applyMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payment-proof janitor</CardTitle>
        <CardDescription>
          Scan the <code>payment-proofs</code> bucket for orphaned uploads (no matching
          declaration) and delete those past the grace window. Also runs nightly at 03:00.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Button
            variant="primary"
            size="md"
            aria-label="Run proof janitor dry-run"
            disabled={busy}
            onClick={() => dryRunMutation.mutate()}
          >
            {dryRunMutation.isPending ? "Scanning…" : "Run dry-run"}
          </Button>
          <Button
            variant="ghost"
            size="md"
            aria-label="Apply proof janitor"
            disabled={busy}
            onClick={() => applyMutation.mutate()}
          >
            {applyMutation.isPending ? "Applying…" : "Apply (delete orphans)"}
          </Button>
        </div>
        {lastResult && <ResultPanel result={lastResult} />}
      </CardContent>
    </Card>
  );
}
