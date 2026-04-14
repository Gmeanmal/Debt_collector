import { useState } from "react";
import type { DebtContractAuditOut } from "@/services/debtContracts/debtContractsApi";

const EVENT_LABELS: Record<string, string> = {
  proposed: "Proposed",
  countered: "Counter-proposed",
  accepted_counter: "Counter accepted",
  rejected_counter: "Counter rejected",
  signed: "Signed",
  cancelled: "Cancelled",
  closed: "Closed",
  breached: "Breached",
  completed: "Completed",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

interface Props {
  entries: DebtContractAuditOut[];
}

export function ContractAuditLog({ entries }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-base-surface border border-base-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-base-text hover:text-pink-primary transition-colors"
        aria-expanded={open}
      >
        <span>Audit log ({entries.length} events)</span>
        <span className="text-base-text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-base-border divide-y divide-base-border">
          {entries.length === 0 && (
            <p className="px-5 py-4 text-sm text-base-text-muted">No events yet.</p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="px-5 py-3 flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-base-text">
                  {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                </span>
                <span className="text-xs text-base-text-muted">{fmtDate(entry.created_at)}</span>
              </div>
              {entry.from_status && entry.to_status && (
                <p className="text-xs text-base-text-muted">
                  {entry.from_status} → {entry.to_status}
                </p>
              )}
              {entry.note && <p className="text-xs text-base-text-subtle">{entry.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
