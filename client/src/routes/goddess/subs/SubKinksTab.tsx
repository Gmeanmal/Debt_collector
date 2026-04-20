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

type BadgeVariant = "danger" | "default" | "warning";

const RATING_VARIANT: Record<string, BadgeVariant> = {
  hard_limit: "danger",
  soft_limit: "warning",
  prefer_not_to_say: "default",
};

function ratingVariant(rating: string): BadgeVariant {
  return RATING_VARIANT[rating] ?? "default";
}

interface KinkItemRowProps {
  item: KinkItem;
}

function KinkItemRow({ item }: KinkItemRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-line last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-text">{item.label}</span>
          {item.safety_flag && (
            <AlertTriangle
              size={14}
              className="shrink-0 text-warn-ink"
              aria-label="Safety-flagged item"
            />
          )}
          {item.is_custom && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-bg-inset text-text-mute border border-line leading-none font-mono">
              custom
            </span>
          )}
        </div>
        {item.note && <p className="text-xs text-text-mute italic leading-snug">"{item.note}"</p>}
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
    <div className="border border-line rounded-[10px] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "bg-bg-elev hover:bg-bg-inset transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
        )}
        aria-expanded={expanded}
        aria-label={`Expand ${category.label} kink category`}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-text-faint shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-text-faint shrink-0" />
          )}
          <span className="text-sm font-semibold text-text">{category.label}</span>
          {category.safety_flag && (
            <AlertTriangle
              size={14}
              className="text-warn-ink shrink-0"
              aria-label="Safety-flagged"
            />
          )}
        </div>
        <span className="text-xs text-text-faint">
          {category.items.length} items · {rated} rated
        </span>
      </button>

      {expanded && (
        <div className="px-4 bg-bg">
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
            className="h-12 rounded-[10px] border border-line bg-bg-elev animate-pulse"
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
    return <p className="text-sm text-text-mute pt-4">No kink data available.</p>;
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-xs text-text-faint">Read-only view — the sub owns her kink matrix.</p>
      {matrix.categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </div>
  );
}
