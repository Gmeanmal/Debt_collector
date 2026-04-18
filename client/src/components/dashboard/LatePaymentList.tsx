import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, AlertCircle } from "lucide-react";
import type { LatePaymentItem } from "@/services/dashboards/dashboardsApi";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { formatGBP } from "@/services/format/currency";

interface Props {
  items: LatePaymentItem[];
}

function useContractSlugMap(): Map<string, string> {
  // TODO LATE-1 / KPI-1: backend should ship `contract_slug` on LatePaymentItem so this
  // secondary fetch is unnecessary. Remove this lookup once the DTO includes the slug.
  const { data: contracts = [] } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: listGoddessDebtsApi,
    staleTime: 60_000,
  });
  const map = new Map<string, string>();
  for (const c of contracts) {
    map.set(c.id, c.slug);
  }
  return map;
}

function linkFor(item: LatePaymentItem, slugMap: Map<string, string>): string | null {
  const subKey = item.sub_username ?? item.sub_id;
  if (item.kind === "rolling") return `/goddess/subs/${subKey}/rolling`;
  const slug = slugMap.get(item.context_id);
  if (!slug) return null;
  return `/debts/${slug}`;
}

export function LatePaymentList({ items }: Props) {
  const slugMap = useContractSlugMap();

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
        const amount = formatGBP(item.amount_due);
        const href = linkFor(item, slugMap);
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
                {href ? (
                  <Link
                    to={href}
                    className="font-display text-base text-base-text hover:text-pink-primary transition-colors truncate flex items-center gap-1"
                  >
                    {item.sub_display_name ?? "Unknown sub"}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ) : (
                  <span className="font-display text-base text-base-text truncate">
                    {item.sub_display_name ?? "Unknown sub"}
                  </span>
                )}
                <Badge
                  variant={item.kind === "rolling" ? "info" : "primary"}
                  className="self-start"
                >
                  {item.kind}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-base text-base-text">{amount}</span>
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
