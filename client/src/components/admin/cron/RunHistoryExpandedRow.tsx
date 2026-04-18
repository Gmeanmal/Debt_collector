import type { CronRunSummaryOut } from "@/api/adminCron";
import { toSentenceLabel } from "@/services/admin/adminCronService";

interface Props {
  run: CronRunSummaryOut;
}

export function RunHistoryExpandedRow({ run }: Props) {
  const errors = run.errors ?? [];

  return (
    <div className="bg-base-surface px-4 py-3 border-t border-base-border flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-base-text-muted uppercase tracking-wider mb-1">
          Summary
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-0.5">
          {Object.entries(run.summary).map(([key, val]) => (
            <div key={key} className="flex gap-1.5">
              <dt className="text-xs text-base-text-muted">{toSentenceLabel(key)}:</dt>
              <dd className="text-xs font-semibold text-base-text">{val}</dd>
            </div>
          ))}
        </dl>
      </div>

      {errors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-status-danger uppercase tracking-wider mb-1">
            Errors ({errors.length})
          </p>
          <ul className="flex flex-col gap-0.5">
            {errors.map((e, i) => {
              const phase = e.phase ?? "unknown";
              const message = e.message ?? String(e);
              const subId = e.sub_id as string | undefined;
              return (
                <li key={i} className="text-xs text-base-text-muted flex flex-wrap gap-1">
                  {subId && (
                    <span title={subId} className="font-mono cursor-help">
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
