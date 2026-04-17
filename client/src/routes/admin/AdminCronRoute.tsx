import { useMutation } from "@tanstack/react-query";
import { runCronNowApi, type CronRunOut } from "@/services/admin/cronApi";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

export function AdminCronRoute() {
  const mutation = useMutation<CronRunOut, Error>({
    mutationFn: runCronNowApi,
  });

  const result = mutation.data;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Run cron
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Manually trigger the daily cron job (rolling tributes + contract period ticks).
          </p>
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="relative inline-flex w-fit group" title="Dry-run coming in W7 CRON-1">
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={true}
                title="Disabled pending admin safe-mode"
                aria-label="Run cron now"
                className="px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary self-start"
              >
                Run cron now
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-xs rounded bg-base-surface border border-base-border px-2 py-1 text-xs text-base-text-muted opacity-0 group-hover:opacity-100 transition-opacity shadow-[var(--shadow-card)]"
              >
                Dry-run coming in W7 CRON-1
              </span>
            </span>
            <p className="text-xs text-base-text-muted">Dry-run mode coming in W7 CRON-1.</p>
          </div>

          {mutation.isError && (
            <p className="text-sm text-status-danger">{mutation.error.message}</p>
          )}

          {result && (
            <div className="bg-base-surface-raised border border-base-border rounded p-4 flex flex-col gap-1">
              <p className="text-xs text-status-success font-semibold">OK</p>
              <p className="text-xs text-base-text-muted">Ran at {fmtDate(result.ran_at)}</p>
              <p className="text-sm text-base-text mt-1">
                Subs processed: <span className="font-semibold">{result.subs}</span>
              </p>
              <p className="text-sm text-base-text">
                Rolling tributes touched: <span className="font-semibold">{result.rolling}</span>
              </p>
              <p className="text-sm text-base-text">
                Contract period ticks: <span className="font-semibold">{result.contracts}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
