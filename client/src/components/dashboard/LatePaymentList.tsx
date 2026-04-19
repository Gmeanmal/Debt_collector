import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, AlertCircle } from "lucide-react";
import type { LatePaymentItem } from "@/services/dashboards/dashboardsApi";
import { listGoddessDebtsApi } from "@/services/debtContracts/debtContractsApi";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  items: LatePaymentItem[];
}

function useContractSlugMap(): Map<string, string> {
  // TODO LATE-1 / KPI-1: backend should ship `contract_slug` on LatePaymentItem so this
  // secondary fetch is unnecessary. Remove this lookup once the DTO includes the slug.
  const { data: contracts = [] } = useQuery({
    queryKey: queryKeys.goddess.contracts(),
    queryFn: () => listGoddessDebtsApi(),
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
      <div className="bg-bg-elev border border-line rounded-[10px] p-8 text-center">
        <p className="font-display italic text-lg text-text-mute">
          Nothing late. The house is in order.
        </p>
      </div>
    );
  }

  return (
    <ul className="bg-bg-elev border border-line rounded-[10px] px-4">
      {items.map((item) => {
        const isLate = item.days_late > 0;
        const amount = Number(item.amount_due);
        const href = linkFor(item, slugMap);
        return (
          <li
            key={`${item.kind}-${item.context_id}`}
            className="group flex items-center justify-between gap-4 border-b border-line last:border-b-0 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                  isLate
                    ? "border-line bg-bad-bg text-bad-ink"
                    : "border-line bg-bg-sunken text-text-mute",
                )}
              >
                {isLate ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                {href ? (
                  <Link
                    to={href}
                    className="font-display italic text-[16px] text-text hover:text-accent-deep transition-colors truncate flex items-center gap-1"
                  >
                    {item.sub_display_name ?? "Unknown sub"}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ) : (
                  <span className="font-display italic text-[16px] text-text truncate">
                    {item.sub_display_name ?? "Unknown sub"}
                  </span>
                )}
                <Badge
                  variant={item.kind === "rolling" ? "pink" : "neutral"}
                  className="self-start"
                >
                  {item.kind}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <Money value={amount} tone={isLate ? "bad" : "default"} />
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.14em]",
                  isLate ? "text-bad-ink" : "text-ok-ink",
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
