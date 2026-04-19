import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/money";
import type { LateContractItem } from "@/services/goddess/lateContractsApi";
import { formatLondon } from "@/services/format/datetime";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

interface ContractRowProps {
  item: LateContractItem;
}

function ContractRow({ item }: ContractRowProps) {
  const displayName = item.sub_display_name ?? `@${item.sub_username}`;
  const hasLastPayment = item.last_payment_at != null && item.last_payment_at !== "";
  const lastTribute = hasLastPayment ? formatLondon(item.last_payment_at, "date") : "never";

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-l-2 border-line border-l-bad-ink bg-bg-elev p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link
            to={`/goddess/subs/${item.sub_username}`}
            className="block truncate font-medium text-text transition-colors hover:text-accent-deep"
          >
            {displayName}
          </Link>
          <div className="truncate font-mono text-[11px] text-text-faint">@{item.sub_username}</div>
        </div>
      </div>

      <div className="min-w-0 sm:flex-1">
        <Eyebrow>Last tribute</Eyebrow>
        <div className="mt-1 font-display italic text-[14px] text-text">{lastTribute}</div>
      </div>

      <div className="flex items-center gap-3">
        <Money value={Number(item.overdue_amount)} tone="bad" big />
        {item.days_late > 0 && <Badge variant="warn">Late {item.days_late} days</Badge>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="danger" size="sm" type="button">
          Breach
        </Button>
        <Button variant="soft" size="sm" type="button">
          Message
        </Button>
      </div>
    </div>
  );
}

interface LateContractsSectionProps {
  items: LateContractItem[];
}

export function LateContractsSection({ items }: LateContractsSectionProps) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.days_late - a.days_late), [items]);

  if (items.length === 0) {
    return <EmptyState title="Nobody is late. For now." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((item) => (
        <ContractRow key={item.contract_id} item={item} />
      ))}
    </div>
  );
}
