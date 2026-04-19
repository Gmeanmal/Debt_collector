import { ChartPanel, ChartError } from "@/components/dashboard/ChartPanel";
import { Money } from "@/components/ui/money";
import type { TopSubRevenue } from "@/types/dashboard";

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
        <p className="text-xs text-text-mute">No payments yet.</p>
      ) : (
        <ol className="flex flex-col" aria-label="Subs ranked by generated revenue">
          {data.map((sub, idx) => (
            <li
              key={sub.username}
              className="flex items-center gap-3 border-b border-line last:border-b-0 py-2"
            >
              <span
                className="font-mono text-[11px] text-text-faint w-4 flex-shrink-0 text-right"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-trace font-mono text-[11px] font-semibold text-accent-deep border border-line"
                aria-hidden="true"
              >
                {initials(sub.display_name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate font-display italic text-[14px] text-text">
                  {sub.display_name}
                </span>
                <span className="block truncate font-mono text-[11px] text-text-faint">
                  @{sub.username}
                </span>
              </span>
              <Money
                value={Number(sub.total)}
                tone={idx === 0 ? "accent" : "default"}
                className="tabular-nums"
              />
            </li>
          ))}
        </ol>
      )}
    </ChartPanel>
  );
}
