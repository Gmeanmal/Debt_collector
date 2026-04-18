import { useEffect, useRef } from "react";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { GoddessContractFilters } from "@/services/debtContracts/debtContractsApi";
import type { DebtContractStatus } from "@/services/debtContracts/debtContractsApi";
import type { GoddessSub } from "@/services/payments/paymentsApi";

const ALL_STATUSES: DebtContractStatus[] = [
  "pending_sub",
  "pending_dom",
  "pending_dom_counter",
  "pending_sub_signature",
  "active",
  "closed",
  "breached",
  "completed",
  "cancelled_by_dom",
];

const STATUS_LABELS: Record<DebtContractStatus, string> = {
  pending_sub: "Pending sub",
  pending_dom: "Pending goddess",
  pending_dom_counter: "Awaiting counter",
  pending_sub_signature: "Pending signature",
  active: "Active",
  closed: "Closed",
  breached: "Breached",
  completed: "Completed",
  cancelled_by_dom: "Cancelled",
};

interface Props {
  filters: GoddessContractFilters;
  subs: GoddessSub[];
  onFiltersChange: (f: GoddessContractFilters) => void;
}

function useDebounced(value: GoddessContractFilters, delay: number, cb: (v: GoddessContractFilters) => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    const t = setTimeout(() => cbRef.current(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
}

export function ContractFilters({ filters, subs, onFiltersChange }: Props) {
  useDebounced(filters, 400, onFiltersChange);

  const selectedSub = subs.find((s) => s.id === filters.sub_id) ?? null;

  const minVal = filters.min_amount ?? "";
  const maxVal = filters.max_amount ?? "";
  const amountError =
    minVal !== "" && maxVal !== "" && Number(minVal) > Number(maxVal)
      ? "Min must be ≤ Max"
      : null;

  function toggleStatus(s: DebtContractStatus) {
    const current = filters.status ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onFiltersChange({ ...filters, status: next.length > 0 ? next : undefined });
  }

  function handleSubChange(sub: GoddessSub | null) {
    onFiltersChange({ ...filters, sub_id: sub?.id });
  }

  function handleMinChange(raw: string) {
    const n = raw === "" ? undefined : Number(raw);
    onFiltersChange({ ...filters, min_amount: n });
  }

  function handleMaxChange(raw: string) {
    const n = raw === "" ? undefined : Number(raw);
    onFiltersChange({ ...filters, max_amount: n });
  }

  const active = filters.status ?? [];

  return (
    <div className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            aria-pressed={active.includes(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              active.includes(s)
                ? "bg-pink-primary text-pink-foreground border-pink-primary"
                : "bg-base-surface-raised text-base-text-muted border-base-border hover:border-pink-primary"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-base-text-muted mb-1">Sub</label>
          <SearchableSelect
            options={subs}
            value={selectedSub}
            onChange={handleSubChange}
            getLabel={(s) => `${s.display_name} (@${s.username})`}
            getValue={(s) => s.id}
            placeholder="All subs"
            nullable
            ariaLabel="Filter by sub"
          />
        </div>

        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs font-semibold text-base-text-muted mb-1">Min £</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={minVal}
              onChange={(e) => handleMinChange(e.target.value)}
              placeholder="0.00"
              className="w-24 h-11 rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-base-text-muted mb-1">Max £</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={maxVal}
              onChange={(e) => handleMaxChange(e.target.value)}
              placeholder="∞"
              className="w-24 h-11 rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
            />
          </div>
        </div>
      </div>

      {amountError && <p className="text-xs text-status-danger">{amountError}</p>}
    </div>
  );
}
