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
    return <p className="text-sm text-text-mute">Loading…</p>;
  }

  if (runs.length === 0) {
    return <p className="text-sm text-text-mute">No runs yet.</p>;
  }

  return (
    <div className="bg-bg-elev border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-sm divide-y divide-line">
        <thead className="bg-bg-sunken">
          <tr>
            <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Started
            </th>
            <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Kind
            </th>
            <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Duration
            </th>
            <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
              Errors
            </th>
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
                  className="border-b border-line last:border-0 hover:bg-bg-sunken/60 cursor-pointer transition-colors"
                  aria-expanded={isExpanded}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-text-faint tracking-[0.08em]">
                    {formatStartedAt(run.started_at)}
                  </td>
                  <td className="px-4 py-3">
                    {run.dry_run ? (
                      <Badge variant="neutral">Dry-run</Badge>
                    ) : (
                      <Badge variant="ok">Real</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-mute text-sm">
                    {formatDuration(run.duration_ms)}
                  </td>
                  <td className="px-4 py-3">
                    {errCount > 0 ? (
                      <span className="text-bad-ink font-semibold text-sm">{errCount}</span>
                    ) : (
                      <span className="text-text-mute text-sm">0</span>
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
