import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  addGBPDecimalStrings,
  formatGBP,
  formatNextPaymentDue,
} from "@/services/dashboards/subDashboardFormat";
import type { SubDashboardSummary } from "@/types/dashboard";

interface Props {
  summary: SubDashboardSummary;
}

interface TileProps {
  label: string;
  value: string;
  sublabel?: string;
  to?: string;
  dangerBorder?: boolean;
}

function SubTile({ label, value, sublabel, to, dangerBorder = false }: TileProps) {
  const inner = (
    <div
      className={cn(
        "luxe-surface relative isolate overflow-hidden rounded-lg p-4 flex flex-col gap-1 min-w-0 border transition-colors",
        dangerBorder ? "border-status-danger" : "border-base-border",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-base-text-subtle">
        {label}
      </span>
      <span
        className="font-display text-3xl tracking-tight leading-none tabular-nums text-base-text"
        role="status"
      >
        {value}
      </span>
      {sublabel && <span className="text-xs text-base-text-muted">{sublabel}</span>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }

  return inner;
}

function buildLateSublabel(rolling: string, contract: string): string | undefined {
  const r = parseFloat(rolling);
  const c = parseFloat(contract);
  if (r > 0 && c > 0) {
    return `${formatGBP(rolling)} rolling · ${formatGBP(contract)} contracts`;
  }
  if (r > 0) return `${formatGBP(rolling)} rolling`;
  if (c > 0) return `${formatGBP(contract)} contracts`;
  return undefined;
}

function buildStreakSublabel(days: number): string {
  if (days <= 0) return "no streak yet";
  if (days === 1) return "day streak";
  return "days streak";
}

export function SubSummaryGrid({ summary }: Props) {
  const lateTotal = addGBPDecimalStrings(summary.late_rolling_amount, summary.late_contract_amount);
  const isLate = parseFloat(lateTotal) > 0;
  const lateSublabel = isLate
    ? buildLateSublabel(summary.late_rolling_amount, summary.late_contract_amount)
    : "all caught up";

  const { next_payment_amount, next_payment_due_at } = summary;
  const hasNextPayment = next_payment_amount !== null && next_payment_due_at !== null;
  const nextPaymentValue = hasNextPayment ? formatGBP(next_payment_amount) : "None scheduled";
  const nextPaymentSublabel = hasNextPayment
    ? (formatNextPaymentDue(next_payment_due_at) ?? undefined)
    : undefined;

  const pendingSublabel = summary.pending_approvals_count > 0 ? "awaiting goddess" : undefined;

  const streakSublabel = buildStreakSublabel(summary.journal_streak_days);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <SubTile
        label="Pending approvals"
        value={String(summary.pending_approvals_count)}
        sublabel={pendingSublabel}
        to="/sub/adjustments"
      />
      <SubTile label="Next payment" value={nextPaymentValue} sublabel={nextPaymentSublabel} />
      <SubTile
        label="Streak"
        value={String(summary.journal_streak_days)}
        sublabel={streakSublabel}
        to="/sub/journal"
      />
      <SubTile
        label="Late"
        value={formatGBP(lateTotal)}
        sublabel={lateSublabel}
        dangerBorder={isLate}
      />
    </div>
  );
}
