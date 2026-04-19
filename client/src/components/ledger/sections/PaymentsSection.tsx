import { useQuery } from "@tanstack/react-query";
import {
  listMyPaymentsApi,
  type DeclarationSource,
  type PaymentOut,
  type PaymentStatus,
} from "@/services/payments/paymentsApi";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/queryKeys";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

const LEDGER_PAYMENT_LIMIT = 15;

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "debt";

const STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pending: "warning",
  validated: "success",
  rejected: "danger",
  cancelled: "default",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  validated: "Validated",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
  ingested: "Auto-ingested",
};

const SOURCE_VARIANT: Record<DeclarationSource, BadgeVariant> = {
  sub_declared: "default",
  goddess_recorded: "debt",
  ingested: "default",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ");
}

function PaymentRow({ payment }: { payment: PaymentOut }) {
  return (
    <li className="flex flex-col gap-1 py-2 border-b border-base-border/40 last:border-b-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-base-text font-semibold">{formatGBP(payment.amount)}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[payment.status]}>{STATUS_LABEL[payment.status]}</Badge>
          <Badge variant={SOURCE_VARIANT[payment.source]}>{SOURCE_LABEL[payment.source]}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-base-text-muted flex-wrap">
        <span className="capitalize">{formatCategory(payment.category)}</span>
        <span>·</span>
        <span>{formatLondon(payment.declared_at, "datetime")}</span>
        {payment.method_name && (
          <>
            <span>·</span>
            <span>{payment.method_name}</span>
          </>
        )}
      </div>
      {payment.status === "rejected" && payment.rejection_reason && (
        <p className="text-xs text-status-danger">Rejected: {payment.rejection_reason}</p>
      )}
    </li>
  );
}

export function PaymentsSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sub.payments(),
    queryFn: listMyPaymentsApi,
  });

  const payments = (data ?? []).slice(0, LEDGER_PAYMENT_LIMIT);
  const totalShown = data?.length ?? 0;
  const mostRecent = payments[0]?.declared_at;

  return (
    <LedgerSection title="Payments" updatedAt={mostRecent}>
      {isLoading && <LedgerLoading />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && payments.length === 0 && (
        <LedgerEmpty message="No payments declared yet." />
      )}
      {payments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-base-text-muted">
            Showing the {payments.length} most recent of {totalShown}.
          </p>
          <ul className="flex flex-col">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
        </div>
      )}
    </LedgerSection>
  );
}
