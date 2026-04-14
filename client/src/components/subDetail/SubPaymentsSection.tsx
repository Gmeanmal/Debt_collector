import { useQuery } from "@tanstack/react-query";
import { listPendingPaymentsApi } from "@/services/payments/paymentsApi";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";

interface Props {
  subId: string;
}

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  validated: "bg-status-success/20 text-status-success",
  rejected: "bg-debt-muted text-status-danger",
  cancelled: "bg-base-surface-raised text-base-text-muted",
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function SubPaymentsSection({ subId }: Props) {
  const {
    data: all = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["goddessPendingPayments"],
    queryFn: listPendingPaymentsApi,
  });

  const items = all.filter((p) => p.sub_id === subId);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-pink-primary">Pending payments</h2>
      {isLoading && <ListSkeleton rows={2} />}
      {isError && (
        <ErrorState
          title="Failed to load payments"
          message={(error as Error | undefined)?.message}
        />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-base-text-muted text-sm italic">No pending payments for this sub.</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((p) => (
          <div
            key={p.id}
            className="bg-base-surface border border-base-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-semibold text-base-text text-sm">
                £{Number(p.amount).toFixed(2)}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-base-surface-raised text-base-text-muted capitalize">
                {p.category.replace(/_/g, " ")}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_CLASSES[p.status] ?? ""}`}
              >
                {p.status}
              </span>
            </div>
            <span className="text-xs text-base-text-muted">{formatDate(p.declared_at)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
