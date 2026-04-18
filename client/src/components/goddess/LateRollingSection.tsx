import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysLateClass } from "@/services/goddess/lateColour";
import type { LateSubItem } from "@/services/goddess/lateSubsApi";

type SortKey = "days_late" | "overdue_amount" | "display_name";
type SortDir = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
}

function SortHeader({ label, col, active, dir, onSort }: SortHeaderProps) {
  const isActive = col === active;
  return (
    <th className="px-4 py-3 text-left font-medium text-base-text-muted">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-base-text transition-colors"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-pink-primary" />
          ) : (
            <ChevronDown className="h-3 w-3 text-pink-primary" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

interface RollingRowProps {
  item: LateSubItem;
}

function RollingRow({ item }: RollingRowProps) {
  const lastPayment = item.last_payment_at
    ? new Date(item.last_payment_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const subKey = item.sub_username ?? null;

  return (
    <tr className="border-b border-base-border/50 hover:bg-base-surface-raised/50 transition-colors">
      <td className="px-4 py-3">
        {subKey ? (
          <Link
            to={`/goddess/subs/${subKey}`}
            className="font-medium text-base-text hover:text-pink-primary transition-colors"
          >
            {item.display_name ?? `@${subKey}`}
          </Link>
        ) : (
          <span className="font-medium text-base-text">{item.display_name ?? "Unknown sub"}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`font-semibold ${daysLateClass(item.days_late)}`}>{item.days_late}d</span>
      </td>
      <td className="px-4 py-3 text-base-text">£{Number(item.overdue_amount).toFixed(2)}</td>
      <td className="px-4 py-3 text-base-text-muted">{lastPayment}</td>
    </tr>
  );
}

interface LateRollingSectionProps {
  items: LateSubItem[];
}

export function LateRollingSection({ items }: LateRollingSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>("days_late");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "days_late") {
      cmp = a.days_late - b.days_late;
    } else if (sortKey === "overdue_amount") {
      cmp = Number(a.overdue_amount) - Number(b.overdue_amount);
    } else {
      cmp = (a.display_name ?? "").localeCompare(b.display_name ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <section>
      <h2 className="text-lg font-semibold text-base-text mb-4">Late on rolling</h2>
      {items.length === 0 ? (
        <EmptyState
          title="No one is late"
          message="All subs are currently on time with their rolling tributes."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-surface-raised">
                <SortHeader
                  label="Name"
                  col="display_name"
                  active={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Days late"
                  col="days_late"
                  active={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Overdue (GBP)"
                  col="overdue_amount"
                  active={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 text-left font-medium text-base-text-muted">
                  Last payment
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <RollingRow key={item.sub_id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
