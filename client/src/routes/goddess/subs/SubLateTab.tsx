import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getLateSubsApi } from "@/services/goddess/lateSubsApi";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

interface Props {
  subId: string;
}

type LateRow = {
  key: string;
  type: "Rolling" | "Contract";
  amount: number;
  daysLate: number;
  sinceDate: string | null;
};

type SortKey = "type" | "amount" | "daysLate" | "sinceDate";
type SortDir = "asc" | "desc";

function daysSince(iso: string): number {
  const since = new Date(iso);
  return Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null): string {
  return formatLondon(iso, "date");
}

export function SubLateTab({ subId }: Props) {
  const { data: allLateSubs = [], isLoading: loadingRolling } = useQuery({
    queryKey: queryKeys.goddess.lateSubs(),
    queryFn: getLateSubsApi,
  });

  const { data: allContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: () => listGoddessDebtsApi(),
  });

  const isLoading = loadingRolling || loadingContracts;

  const rollingRow: LateRow | null = (() => {
    const item = allLateSubs.find((s) => s.sub_id === subId);
    if (!item) return null;
    return {
      key: `rolling-${subId}`,
      type: "Rolling",
      amount: Number(item.overdue_amount),
      daysLate: item.days_late,
      sinceDate: item.last_payment_at ?? null,
    };
  })();

  const contractRows: LateRow[] = allContracts
    .filter((c) => c.sub_id === subId && !c.on_track && c.status === "active")
    .map((c) => ({
      key: `contract-${c.id}`,
      type: "Contract",
      amount: Number(c.remaining),
      daysLate: daysSince(c.last_payment_at ?? c.signed_at ?? c.created_at),
      sinceDate: c.last_payment_at ?? null,
    }));

  const rows: LateRow[] = [...(rollingRow ? [rollingRow] : []), ...contractRows];

  if (isLoading) {
    return <p className="text-base-text-muted text-sm py-4">Loading…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-base-text-muted text-sm py-4 italic">No late items for this sub.</p>;
  }

  return <LateTable rows={rows} />;
}

interface LateTableProps {
  rows: LateRow[];
}

function LateTable({ rows }: LateTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("daysLate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "type") {
      cmp = a.type.localeCompare(b.type);
    } else if (sortKey === "amount") {
      cmp = a.amount - b.amount;
    } else if (sortKey === "sinceDate") {
      const aT = a.sinceDate ? new Date(a.sinceDate).getTime() : 0;
      const bT = b.sinceDate ? new Date(b.sinceDate).getTime() : 0;
      cmp = aT - bT;
    } else {
      cmp = a.daysLate - b.daysLate;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-base-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-base-border bg-base-surface-raised">
            <ColHeader label="Type" col="type" active={sortKey} dir={sortDir} onSort={handleSort} />
            <ColHeader
              label="Amount (GBP)"
              col="amount"
              active={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />
            <ColHeader
              label="Days late"
              col="daysLate"
              active={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />
            <ColHeader
              label="Since"
              col="sinceDate"
              active={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.key}
              className="border-b border-base-border/50 hover:bg-base-surface-raised/50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-base-text">{row.type}</td>
              <td className="px-4 py-3 text-base-text">{formatGBP(row.amount)}</td>
              <td className="px-4 py-3">
                <span className="font-semibold text-pink-primary">{row.daysLate}d</span>
              </td>
              <td className="px-4 py-3 text-base-text-muted">{fmtDate(row.sinceDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ColHeaderProps {
  label: string;
  col: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
}

function ColHeader({ label, col, active, dir, onSort }: ColHeaderProps) {
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
