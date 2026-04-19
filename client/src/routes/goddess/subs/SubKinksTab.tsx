import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { getSubKinkMatrixForGoddess } from "@/services/goddessSubDetail/goddessSubDetailApi";
import type { KinkCategory, KinkItem } from "@/services/kinks/kinksApi";

interface Props {
  subId: string;
}

const RATING_LABELS: Record<string, string> = {
  hard_limit: "Hard limit",
  soft_limit: "Soft limit",
  curious: "Curious",
  loves: "Loves",
  fetish_need: "Fetish / need",
  not_set: "Not set",
  prefer_not_to_say: "Prefer not to say",
};

const RATING_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  hard_limit: "destructive",
  soft_limit: "secondary",
  prefer_not_to_say: "outline",
};

function ratingVariant(rating: string): "destructive" | "secondary" | "outline" {
  return RATING_VARIANT[rating] ?? "outline";
}

interface KinkItemRowProps {
  item: KinkItem;
}

function KinkItemRow({ item }: KinkItemRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-base-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-base-text">{item.label}</span>
          {item.safety_flag && (
            <AlertTriangle
              size={14}
              className="shrink-0 text-status-warning"
              aria-label="Safety-flagged item"
            />
          )}
          {item.is_custom && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-violet-muted text-violet-primary border border-violet-primary/20 leading-none">
              custom
            </span>
          )}
        </div>
        {item.note && (
          <p className="text-xs text-base-text-muted italic leading-snug">"{item.note}"</p>
        )}
      </div>
      <div className="shrink-0">
        <Badge variant={ratingVariant(item.rating)}>
          {RATING_LABELS[item.rating] ?? item.rating}
        </Badge>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: KinkCategory;
}

function CategorySection({ category }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const rated = category.items.filter((i) => i.rating !== "not_set").length;

  return (
    <div className="border border-base-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "bg-base-surface-raised hover:bg-base-surface-raised/70 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary focus-visible:ring-inset",
        )}
        aria-expanded={expanded}
        aria-label={`Expand ${category.label} kink category`}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-base-text-muted shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-base-text-muted shrink-0" />
          )}
          <span className="text-sm font-semibold text-base-text">{category.label}</span>
          {category.safety_flag && (
            <AlertTriangle
              size={14}
              className="text-status-warning shrink-0"
              aria-label="Safety-flagged"
            />
          )}
        </div>
        <span className="text-xs text-base-text-subtle">
          {category.items.length} items · {rated} rated
        </span>
      </button>

      {expanded && (
        <div className="px-4 bg-base-surface">
          {category.items.map((item) => (
            <KinkItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SubKinksTab({ subId }: Props) {
  const {
    data: matrix,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.subKinks.forSub(subId),
    queryFn: () => getSubKinkMatrixForGoddess(subId),
    enabled: subId.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg border border-base-border bg-base-surface-raised animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-4">
        <ErrorState
          title="Could not load kink matrix"
          message={error instanceof Error ? error.message : "Unknown error"}
        />
      </div>
    );
  }

  if (!matrix || matrix.categories.length === 0) {
    return <p className="text-sm text-base-text-muted pt-4">No kink data available.</p>;
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-xs text-base-text-muted">Read-only view — the sub owns her kink matrix.</p>
      {matrix.categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </div>
  );
}
