import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { KinkRow } from "@/components/kinks/KinkRow";
import type { KinkCategory, KinkMatrix as KinkMatrixType, KinkRating } from "@/services/kinks/kinksApi";

// TODO virtualise once item count >= 100
interface CategorySectionProps {
  category: KinkCategory;
  onRatingChange: (itemId: string, rating: KinkRating) => void;
  pendingItemIds: Set<string>;
}

function CategorySection({ category, onRatingChange, pendingItemIds }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true);

  const ratedCount = category.items.filter((i) => i.rating !== "not_set").length;

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
        aria-controls={`category-${category.id}`}
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
              aria-label="Safety-flagged category"
            />
          )}
        </div>
        <span className="text-xs text-base-text-subtle">
          {ratedCount}/{category.items.length}
        </span>
      </button>

      {expanded && (
        <div id={`category-${category.id}`} className="px-4 bg-base-surface">
          {category.items.map((item) => (
            <KinkRow
              key={item.id}
              item={item}
              onRatingChange={onRatingChange}
              isPending={pendingItemIds.has(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  matrix: KinkMatrixType;
  onRatingChange: (itemId: string, rating: KinkRating) => void;
  pendingItemIds: Set<string>;
}

export function KinkMatrix({ matrix, onRatingChange, pendingItemIds }: Props) {
  if (matrix.categories.length === 0) {
    return (
      <p className="text-sm text-base-text-muted text-center py-10">
        No kink categories have been configured yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matrix.categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          onRatingChange={onRatingChange}
          pendingItemIds={pendingItemIds}
        />
      ))}
    </div>
  );
}
