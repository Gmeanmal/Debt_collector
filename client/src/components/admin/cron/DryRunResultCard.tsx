import type { CronRunSummaryOut } from "@/api/adminCron";
import { toSentenceLabel } from "@/services/admin/adminCronService";

interface Props {
  result: CronRunSummaryOut;
}

export function DryRunResultCard({ result }: Props) {
  const errors = result.errors ?? [];

  return (
    <div className="bg-base-surface-raised border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-status-success uppercase tracking-wider">
        Dry-run preview
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
        {Object.entries(result.summary).map(([key, val]) => (
          <div key={key} className="flex justify-between col-span-1">
            <dt className="text-sm text-base-text-muted">{toSentenceLabel(key)}</dt>
            <dd className="text-sm font-semibold text-base-text">{val}</dd>
          </div>
        ))}
      </dl>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-base-border pt-3">
          <p className="text-xs font-semibold text-status-danger uppercase tracking-wider">
            Errors ({errors.length})
          </p>
          <ul className="flex flex-col gap-1">
            {errors.map((e, i) => {
              const phase = e.phase ?? "unknown";
              const message = e.message ?? String(e);
              const subId = e.sub_id as string | undefined;
              return (
                <li key={i} className="text-xs text-base-text-muted flex flex-wrap gap-1">
                  {subId && (
                    <span
                      title={subId}
                      className="font-mono text-xs text-base-text-muted cursor-help"
                    >
                      · sub {subId.slice(0, 4)}…
                    </span>
                  )}
                  <span className="text-status-danger font-medium">[{phase}]</span>
                  <span>{message}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
