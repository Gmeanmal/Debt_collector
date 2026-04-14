import { Link } from "react-router-dom";
import type { LatePaymentItem } from "@/services/dashboards/dashboardsApi";

interface Props {
  items: LatePaymentItem[];
}

function linkFor(item: LatePaymentItem): string {
  if (item.kind === "rolling") return `/goddess/subs/${item.sub_id}/rolling`;
  return `/debts/${item.context_id}`;
}

const KIND_CLASSES: Record<LatePaymentItem["kind"], string> = {
  rolling: "bg-status-info/15 text-status-info border-status-info/30",
  contract: "bg-pink-primary/15 text-pink-primary border-pink-primary/30",
};

export function LatePaymentList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-base-text-muted text-sm italic">No late payments — everything on time.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isLate = item.days_late > 0;
        const amount = Number(item.amount_due).toFixed(2);
        return (
          <li
            key={`${item.kind}-${item.context_id}`}
            className="bg-base-surface border border-base-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Link
                to={linkFor(item)}
                className="font-semibold text-base-text text-sm hover:text-pink-primary transition-colors focus-visible:ring-2 focus-visible:ring-pink-primary rounded truncate"
              >
                {item.sub_display_name ?? "Unknown sub"}
              </Link>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${KIND_CLASSES[item.kind]}`}
              >
                {item.kind}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-base-text">£{amount}</span>
              <span
                className={
                  isLate
                    ? "text-status-danger font-semibold text-xs"
                    : "text-status-success text-xs"
                }
              >
                {isLate ? `${item.days_late}d late` : "On time"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
