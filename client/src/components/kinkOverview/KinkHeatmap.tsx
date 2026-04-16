import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RATING_COLUMNS,
  type KinkOverview,
  type KinkOverviewItem,
  type RatingColumn,
} from "@/services/kinkOverview/kinkOverviewApi";

const COLUMN_LABELS: Record<RatingColumn, string> = {
  hard_limit: "Hard limit",
  soft_limit: "Soft limit",
  not_set: "Not set",
  curious: "Curious",
  loves: "Loves",
  fetish_need: "Fetish need",
};

const INTENSITY_CLASSES = [
  "",
  "bg-pink-primary/10",
  "bg-pink-primary/20",
  "bg-pink-primary/40",
  "bg-pink-primary/60",
  "bg-pink-primary/80",
] as const;

function intensityClass(count: number, max: number): string {
  if (count === 0 || max === 0) return "";
  const step = Math.ceil((count / max) * 5);
  return INTENSITY_CLASSES[Math.min(step, 5)];
}

interface CellProps {
  count: number;
  max: number;
}

function HeatCell({ count, max }: CellProps) {
  const bg = intensityClass(count, max);
  return (
    <td
      className={cn(
        "text-center text-xs tabular-nums px-2 py-2 border-b border-base-border/40",
        bg,
        count === 0 ? "text-base-text-subtle" : "text-base-text",
      )}
      role="cell"
    >
      {count}
    </td>
  );
}

interface CategoryGroupProps {
  label: string;
  items: KinkOverviewItem[];
  maxPerColumn: Record<RatingColumn, number>;
}

function CategoryGroup({ label, items, maxPerColumn }: CategoryGroupProps) {
  return (
    <>
      <tr>
        <td
          colSpan={RATING_COLUMNS.length + 1}
          className="bg-base-surface-raised text-xs font-semibold text-base-text-muted uppercase tracking-wider px-3 py-2 sticky left-0"
        >
          {label}
        </td>
      </tr>
      {items.map((item) => (
        <tr key={item.item_id} className="hover:bg-base-surface-raised/30 transition-colors">
          <td className="sticky left-0 bg-base-surface px-3 py-2 text-sm text-base-text min-w-[180px] border-b border-base-border/40 z-10">
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.safety_flag && (
                <AlertTriangle
                  size={12}
                  className="text-status-warning shrink-0"
                  aria-label="Safety-flagged item"
                />
              )}
            </span>
          </td>
          {RATING_COLUMNS.map((col) => (
            <HeatCell
              key={col}
              count={item.counts[col] ?? 0}
              max={maxPerColumn[col]}
            />
          ))}
        </tr>
      ))}
    </>
  );
}

interface Props {
  overview: KinkOverview;
}

export function KinkHeatmap({ overview }: Props) {
  const { grouped, maxPerColumn } = useMemo(() => {
    const colMaxes = Object.fromEntries(
      RATING_COLUMNS.map((col) => [col, 0]),
    ) as Record<RatingColumn, number>;

    for (const item of overview.items) {
      for (const col of RATING_COLUMNS) {
        const v = item.counts[col] ?? 0;
        if (v > colMaxes[col]) colMaxes[col] = v;
      }
    }

    const sorted = [...overview.items].sort(
      (a, b) =>
        a.category_sort_order - b.category_sort_order ||
        a.label.localeCompare(b.label),
    );

    const groups = new Map<string, KinkOverviewItem[]>();
    for (const item of sorted) {
      const existing = groups.get(item.category_label) ?? [];
      existing.push(item);
      groups.set(item.category_label, existing);
    }

    return { grouped: groups, maxPerColumn: colMaxes };
  }, [overview]);

  if (overview.items.length === 0) {
    return (
      <p className="text-sm text-base-text-muted text-center py-10">
        No kink items found.
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-[70vh] rounded-lg border border-base-border">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20 bg-base-surface">
          <tr>
            <th
              className="sticky left-0 bg-base-surface px-3 py-3 text-left text-xs font-semibold text-base-text-muted uppercase tracking-wider min-w-[180px] border-b border-base-border z-30"
              scope="col"
            >
              Item
            </th>
            {RATING_COLUMNS.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-2 py-3 text-center text-xs font-semibold text-base-text-muted uppercase tracking-wider border-b border-base-border whitespace-nowrap"
              >
                {COLUMN_LABELS[col]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(grouped.entries()).map(([categoryLabel, items]) => (
            <CategoryGroup
              key={categoryLabel}
              label={categoryLabel}
              items={items}
              maxPerColumn={maxPerColumn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
