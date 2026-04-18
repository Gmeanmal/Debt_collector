import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysLateClass } from "@/services/goddess/lateColour";
import type { LateContractItem } from "@/services/goddess/lateContractsApi";

type SortKey = "days_late" | "overdue_amount" | "sub_display_name";
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

interface ContractRowProps {
  item: LateContractItem;
}

function ContractRow({ item }: ContractRowProps) {
  const lastPayment = item.last_payment_at
    ? new Date(item.last_payment_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="border-b border-base-border/50 hover:bg-base-surface-raised/50 transition-colors">
      <td className="px-4 py-3">
        <Link
          to={`/goddess/subs/${item.sub_username}`}
          className="font-medium text-base-text hover:text-pink-primary transition-colors"
        >
          {item.sub_display_name ?? `@${item.sub_username}`}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className={`font-semibold ${daysLateClass(item.days_late)}`}>{item.days_late}d</span>
      </td>
      <td className="px-4 py-3 text-base-text">£{Number(item.overdue_amount).toFixed(2)}</td>
      <td className="px-4 py-3 text-base-text-muted">{lastPayment}</td>
      <td className="px-4 py-3">
        {item.slug != null ? (
          <Link
            to={`/debts/${item.slug}`}
            className="text-xs text-pink-primary hover:underline"
            aria-label={`View contract for ${item.sub_display_name ?? item.sub_username}`}
          >
            View
          </Link>
        ) : null}
      </td>
    </tr>
  );
}

interface LateContractsSectionProps {
  items: LateContractItem[];
}

export function LateContractsSection({ items }: LateContractsSectionProps) {
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
      cmp = (a.sub_display_name ?? "").localeCompare(b.sub_display_name ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <section>
      <h2 className="text-lg font-semibold text-base-text mb-4">Late on contracts</h2>
      {items.length === 0 ? (
        <EmptyState
          title="No contracts are late"
          message="All subs are currently on time with their debt contract payments."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-border">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-base-border bg-base-surface-raised">
                <SortHeader
                  label="Name"
                  col="sub_display_name"
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
                <th className="px-4 py-3 text-left font-medium text-base-text-muted">Contract</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <ContractRow key={item.contract_id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
