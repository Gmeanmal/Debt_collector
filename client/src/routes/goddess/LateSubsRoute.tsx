import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { getLateSubsApi, type LateSubItem } from "@/services/goddess/lateSubsApi";

type SortKey = "days_late" | "overdue_amount" | "display_name";
type SortDir = "asc" | "desc";

export function LateSubsRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["goddessLateSubs"],
    queryFn: getLateSubsApi,
  });

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            The ledger
          </p>
          <h1 className="mt-3 font-display text-5xl italic leading-none text-base-text">
            Delinquents.
          </h1>
          <p className="mt-3 text-sm text-base-text-muted max-w-md">
            Subs currently late on their rolling tribute.
          </p>
        </header>

        <Separator />

        {isLoading && <ListSkeleton rows={5} />}

        {isError && (
          <ErrorState
            title="Failed to load late subs"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && data && <LateTable items={data} />}
      </div>
    </div>
  );
}

interface LateTableProps {
  items: LateSubItem[];
}

function LateTable({ items }: LateTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("days_late");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (items.length === 0) {
    return (
      <EmptyState
        title="No one is late"
        message="All subs are currently on time with their rolling tributes."
      />
    );
  }

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
    <div className="overflow-x-auto rounded-lg border border-base-border">
      <table className="w-full text-sm">
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
            <th className="px-4 py-3 text-left font-medium text-base-text-muted">Last payment</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <LateRow key={item.sub_id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

interface LateRowProps {
  item: LateSubItem;
}

function LateRow({ item }: LateRowProps) {
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
          to={`/goddess/subs/${item.sub_id}`}
          className="font-medium text-base-text hover:text-pink-primary transition-colors"
        >
          {item.display_name ?? item.sub_id}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="font-semibold text-pink-primary">{item.days_late}d</span>
      </td>
      <td className="px-4 py-3 text-base-text">£{Number(item.overdue_amount).toFixed(2)}</td>
      <td className="px-4 py-3 text-base-text-muted">{lastPayment}</td>
    </tr>
  );
}
