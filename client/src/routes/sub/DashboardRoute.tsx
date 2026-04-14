import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { ContractStatusChip } from "@/components/contracts/ContractStatusChip";
import {
  getSubDashboardApi,
  type ActiveContractSummary,
} from "@/services/dashboards/dashboardsApi";
import type { PaymentOut } from "@/services/payments/paymentsApi";

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "short",
  });
}

const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  validated: "bg-status-success/20 text-status-success",
  rejected: "bg-debt-muted text-status-danger",
  cancelled: "bg-base-surface-raised text-base-text-muted",
};

interface ContractCardProps {
  contract: ActiveContractSummary;
}

const PROGRESS_WIDTH_CLASS: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

function progressWidthClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(clamped / 5) * 5;
  return PROGRESS_WIDTH_CLASS[rounded] ?? "w-0";
}

function ContractCard({ contract }: ContractCardProps) {
  const progressPercent = Math.max(0, Math.min(100, Number(contract.progress_percent)));
  const barClass = progressWidthClass(progressPercent);

  return (
    <Link
      to={`/debts/${contract.id}`}
      className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3 hover:border-pink-primary transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-base-text text-sm">
          Principal £{Number(contract.principal).toFixed(2)}
        </span>
        <ContractStatusChip status={contract.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-base-text-muted">
        <span>Balance</span>
        <span className="text-base-text font-semibold">£{Number(contract.balance).toFixed(2)}</span>
      </div>

      <div className="h-2 rounded-full bg-base-surface-raised overflow-hidden">
        <div className={`h-full bg-pink-primary ${barClass}`} />
      </div>
      <div className="text-xs text-base-text-muted">{progressPercent.toFixed(1)}% paid down</div>

      {contract.next_period_due_at && (
        <div className="text-xs text-base-text-muted">
          Next due <span className="text-base-text">{formatDate(contract.next_period_due_at)}</span>
        </div>
      )}
    </Link>
  );
}

interface PaymentRowProps {
  payment: PaymentOut;
}

function PaymentRow({ payment }: PaymentRowProps) {
  return (
    <tr className="border-t border-base-border">
      <td className="py-2 pr-3 text-base-text text-sm font-semibold whitespace-nowrap">
        £{Number(payment.amount).toFixed(2)}
      </td>
      <td className="py-2 pr-3 text-xs text-base-text-muted capitalize whitespace-nowrap">
        {payment.category.replace(/_/g, " ")}
      </td>
      <td className="py-2 pr-3 whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PAYMENT_STATUS_CLASSES[payment.status] ?? ""}`}
        >
          {payment.status}
        </span>
      </td>
      <td className="py-2 text-xs text-base-text-muted whitespace-nowrap">
        {formatDate(payment.declared_at)}
      </td>
    </tr>
  );
}

export function SubDashboardRoute() {
  const {
    data: dash,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subDashboard"],
    queryFn: getSubDashboardApi,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-base-text-muted text-sm">Loading dashboard…</p>
      </div>
    );
  }
  if (isError || !dash) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-status-danger text-sm">Failed to load dashboard.</p>
      </div>
    );
  }

  const contracts = dash.active_contracts ?? [];
  const payments = dash.recent_payments ?? [];
  const amountDue = Number(dash.amount_due_this_week).toFixed(2);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Dashboard
          </h1>
          <p className="text-sm text-base-text-muted mt-1">
            Your current obligations and recent activity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatCard
            label="Due this week"
            value={`£${amountDue}`}
            accent={dash.is_late ? "danger" : "default"}
            trend={
              dash.is_late ? (
                <span className="text-status-danger font-semibold uppercase">Late</span>
              ) : null
            }
          />
          <StatCard
            label="Total sent"
            value={`£${Number(dash.total_sent).toFixed(2)}`}
            accent="success"
          />
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-pink-primary">Active contracts</h2>
          {contracts.length === 0 ? (
            <p className="text-base-text-muted text-sm italic">No active contracts.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contracts.map((c) => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-pink-primary">Recent payments</h2>
          {payments.length === 0 ? (
            <p className="text-base-text-muted text-sm italic">No payments yet.</p>
          ) : (
            <div className="bg-base-surface border border-base-border rounded-lg p-3 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-2 pr-3 text-xs text-base-text-muted uppercase tracking-wide font-semibold">
                      Amount
                    </th>
                    <th className="pb-2 pr-3 text-xs text-base-text-muted uppercase tracking-wide font-semibold">
                      Category
                    </th>
                    <th className="pb-2 pr-3 text-xs text-base-text-muted uppercase tracking-wide font-semibold">
                      Status
                    </th>
                    <th className="pb-2 text-xs text-base-text-muted uppercase tracking-wide font-semibold">
                      Declared
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <PaymentRow key={p.id} payment={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
