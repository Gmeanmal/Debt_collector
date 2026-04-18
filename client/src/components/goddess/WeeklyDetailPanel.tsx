import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { SidePanel } from "@/components/ui/SidePanel";
import { MethodIcon } from "@/components/paymentMethods/MethodIcon";
import { getWeeklyPaymentDetailApi, type WeeklyPaymentDetail } from "@/services/goddess/weeklyApi";
import { listGoddessSubsApi, type DeclarationSource } from "@/services/payments/paymentsApi";
import { buildWeeklyCsvBlob, weeklyCsvFilename } from "@/services/goddess/weeklyCsv";
import { queryKeys } from "@/lib/queryKeys";
import { formatLondon } from "@/services/format/datetime";
import { formatGBP } from "@/services/format/currency";

const SOURCE_LABEL: Record<DeclarationSource, string> = {
  sub_declared: "Self-declared",
  goddess_recorded: "Goddess-recorded",
  ingested: "Auto-ingested",
};

type BadgeVariant = "default" | "primary" | "debt";

const SOURCE_VARIANT: Record<DeclarationSource, BadgeVariant> = {
  sub_declared: "default",
  goddess_recorded: "debt",
  ingested: "default",
};

function formatMondayLabel(weekStart: string): string {
  return formatLondon(weekStart, "date");
}

function formatValidatedAt(iso: string | null | undefined): string {
  return formatLondon(iso, "datetime");
}

function triggerCsvDownload(payments: WeeklyPaymentDetail[], weekStart: string) {
  const blob = buildWeeklyCsvBlob(payments);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = weeklyCsvFilename(weekStart);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface WeeklyDetailPanelProps {
  weekStart: string;
  bucketTotal: string;
  bucketCount: number;
  onClose: () => void;
}

export function WeeklyDetailPanel({
  weekStart,
  bucketTotal,
  bucketCount,
  onClose,
}: WeeklyDetailPanelProps) {
  const headerId = `weekly-detail-header-${weekStart}`;
  const mondayLabel = formatMondayLabel(weekStart);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.goddess.weeklyPaymentsDetail(weekStart),
    queryFn: () => getWeeklyPaymentDetailApi(weekStart),
  });

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
    staleTime: 60_000,
  });

  const usernameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subs) map.set(s.id, s.username);
    return map;
  }, [subs]);

  const payments = data ?? [];
  const canExport = payments.length > 0;

  function handleExport() {
    if (canExport) triggerCsvDownload(payments, weekStart);
  }

  return (
    <SidePanel onClose={onClose} labelledBy={headerId} closeButtonLabel="Close weekly detail panel">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
            The ledger
          </p>
          <h2 id={headerId} className="font-display text-2xl italic text-base-text">
            Week of {mondayLabel}
          </h2>
          <p className="text-sm text-base-text-muted">
            {bucketCount} {bucketCount === 1 ? "payment" : "payments"} ·{" "}
            <span className="text-base-text font-medium">{formatGBP(bucketTotal)}</span>
          </p>
        </header>

        {isLoading && <ListSkeleton rows={4} />}

        {isError && (
          <ErrorState
            title="Failed to load week detail"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && payments.length === 0 && (
          <EmptyState
            title="No validated payments"
            message="Nothing was validated inside this week."
          />
        )}

        {!isLoading && !isError && payments.length > 0 && (
          <ul className="flex flex-col gap-3">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} username={usernameById.get(p.sub_id)} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-base-border/60 p-4 flex justify-end">
        <button
          type="button"
          onClick={handleExport}
          disabled={!canExport}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-pink-primary/15 text-pink-primary border border-pink-primary/30 hover:bg-pink-primary/25 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
        >
          Export CSV
        </button>
      </div>
    </SidePanel>
  );
}

interface PaymentRowProps {
  payment: WeeklyPaymentDetail;
  username: string | undefined;
}

function PaymentRow({ payment, username }: PaymentRowProps) {
  const subName = payment.sub_display_name ?? "sub";
  const amountLabel = formatGBP(payment.amount);
  const sourceLabel = SOURCE_LABEL[payment.source];
  const sourceVariant = SOURCE_VARIANT[payment.source];

  return (
    <li className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-base-text text-sm">{subName}</p>
          {username && <p className="text-xs text-base-text-muted">@{username}</p>}
        </div>
        <p className="font-semibold text-base-text text-sm whitespace-nowrap">{amountLabel}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs text-base-text-muted capitalize">
        {payment.method_type && <MethodIcon type={payment.method_type} size="sm" />}
        {payment.method_name && <span>{payment.method_name}</span>}
        <span>·</span>
        <span>{payment.category.replace(/_/g, " ")}</span>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={sourceVariant}>{sourceLabel}</Badge>
        <span className="text-xs text-base-text-subtle">
          {formatValidatedAt(payment.validated_at)}
        </span>
      </div>
    </li>
  );
}
