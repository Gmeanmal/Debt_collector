import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import type { TopSubRevenue } from "@/types/dashboard";
import { formatGBP } from "@/services/format/currency";

interface Props {
  data: TopSubRevenue[];
  error?: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TopSubsLeaderboard({ data, error }: Props) {
  return (
    <ChartPanel
      title="Top 5 subs"
      description="By total validated tribute (all time)"
      ariaLabel="Top 5 subs leaderboard"
    >
      {error ? (
        <ChartError message={error} />
      ) : data.length === 0 ? (
        <p className="text-xs text-base-text-muted">No payments yet.</p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Subs ranked by generated revenue">
          {data.map((sub, idx) => (
            <li
              key={sub.username}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-base-surface-raised"
            >
              <span
                className="text-xs font-medium text-base-text-subtle w-4 flex-shrink-0 text-right"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-muted text-xs font-semibold text-pink-primary"
                aria-hidden="true"
              >
                {initials(sub.display_name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium text-base-text">
                  {sub.display_name}
                </span>
                <span className="block truncate text-xs text-base-text-subtle">
                  @{sub.username}
                </span>
              </span>
              <span
                className="text-sm font-semibold text-gold-accent tabular-nums"
                role="status"
                aria-label={`${sub.display_name} total: ${formatGBP(sub.total)}`}
              >
                {formatGBP(sub.total)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </ChartPanel>
  );
}
