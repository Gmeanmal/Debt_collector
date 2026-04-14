import { Link } from "react-router-dom";
import { ArrowUpRight, Clock, AlertCircle } from "lucide-react";
import type { LatePaymentItem } from "@/services/dashboards/dashboardsApi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  items: LatePaymentItem[];
}

function linkFor(item: LatePaymentItem): string {
  if (item.kind === "rolling") return `/goddess/subs/${item.sub_id}/rolling`;
  return `/debts/${item.context_id}`;
}

export function LatePaymentList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="luxe-surface rounded-lg p-8 text-center">
        <p className="font-display text-lg italic text-base-text-muted">
          Nothing late. The house is in order.
        </p>
      </div>
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
            className="group luxe-surface flex items-center justify-between gap-4 rounded-lg p-4 transition-all duration-200 hover:border-pink-primary/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                  isLate
                    ? "border-status-danger/30 bg-status-danger/10 text-status-danger"
                    : "border-status-info/30 bg-status-info/10 text-status-info",
                )}
              >
                {isLate ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link
                  to={linkFor(item)}
                  className="font-display text-base text-base-text hover:text-pink-primary transition-colors truncate flex items-center gap-1"
                >
                  {item.sub_display_name ?? "Unknown sub"}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <Badge
                  variant={item.kind === "rolling" ? "info" : "primary"}
                  className="self-start"
                >
                  {item.kind}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-base text-base-text">£{amount}</span>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.12em]",
                  isLate ? "text-status-danger" : "text-status-success",
                )}
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
