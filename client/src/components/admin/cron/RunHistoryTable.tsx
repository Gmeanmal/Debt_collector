import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { listCronRunsApi } from "@/api/adminCron";
import { formatDuration, formatStartedAt } from "@/services/admin/adminCronService";
import { Badge } from "@/components/ui/badge";
import { RunHistoryExpandedRow } from "@/components/admin/cron/RunHistoryExpandedRow";

export function RunHistoryTable() {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.cronRuns(),
    queryFn: () => listCronRunsApi(50),
    staleTime: 10_000,
  });

  if (isLoading) {
    return <p className="text-sm text-base-text-muted">Loading…</p>;
  }

  if (runs.length === 0) {
    return <p className="text-sm text-base-text-muted">No runs yet.</p>;
  }

  return (
    <div className="rounded-lg border border-base-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-base-surface-raised border-b border-base-border text-xs text-base-text-muted uppercase tracking-wider">
            <th className="px-4 py-2.5 text-left font-medium">Started</th>
            <th className="px-4 py-2.5 text-left font-medium">Kind</th>
            <th className="px-4 py-2.5 text-left font-medium">Duration</th>
            <th className="px-4 py-2.5 text-left font-medium">Errors</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.run_id;
            const errCount = run.errors?.length ?? 0;
            return (
              <>
                <tr
                  key={run.run_id}
                  onClick={() => setExpandedRunId(isExpanded ? null : run.run_id)}
                  className="border-b border-base-border last:border-0 hover:bg-base-surface-raised/60 cursor-pointer transition-colors"
                  aria-expanded={isExpanded}
                >
                  <td className="px-4 py-3 text-base-text font-mono text-xs">
                    {formatStartedAt(run.started_at)}
                  </td>
                  <td className="px-4 py-3">
                    {run.dry_run ? (
                      <Badge variant="default">Dry-run</Badge>
                    ) : (
                      <Badge variant="primary">Real</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-base-text-muted">
                    {formatDuration(run.duration_ms)}
                  </td>
                  <td className="px-4 py-3">
                    {errCount > 0 ? (
                      <span className="text-status-danger font-semibold">{errCount}</span>
                    ) : (
                      <span className="text-base-text-muted">0</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${run.run_id}-expanded`}>
                    <td colSpan={4} className="p-0">
                      <RunHistoryExpandedRow run={run} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
