import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { KinkRow } from "@/components/kinks/KinkRow";
import type {
  KinkCategory,
  KinkItem,
  KinkMatrix as KinkMatrixType,
  KinkRating,
} from "@/services/kinks/kinksApi";

interface CategorySectionProps {
  category: KinkCategory;
  visibleItems: KinkItem[];
  totalItems: number;
  onRatingChange: (itemId: string, rating: KinkRating) => void;
  pendingItemIds: Set<string>;
  recentlyUpdatedAt: Map<string, number>;
}

function CategorySection({
  category,
  visibleItems,
  totalItems,
  onRatingChange,
  pendingItemIds,
  recentlyUpdatedAt,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const ratedCount = category.items.filter((i) => i.rating !== "not_set").length;
  const isFiltered = visibleItems.length < totalItems;

  return (
    <div className="border border-line rounded-[10px] overflow-hidden">
      <button
        type="button"
        id={`category-header-${category.id}`}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "bg-bg-sunken hover:bg-bg-inset transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
        )}
        aria-expanded={expanded}
        aria-controls={`category-body-${category.id}`}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={16} className="text-text-mute shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-text-mute shrink-0" />
          )}
          <span className="text-sm font-semibold text-text">{category.label}</span>
          {category.safety_flag && (
            <AlertTriangle
              size={14}
              className="text-warn-ink shrink-0"
              aria-label="Safety-flagged category"
            />
          )}
        </div>
        <span className="text-xs text-text-faint">
          {isFiltered
            ? `${visibleItems.length}/${totalItems} items · ${ratedCount} rated`
            : `${totalItems} items · ${ratedCount} rated`}
        </span>
      </button>

      {expanded && (
        <div
          id={`category-body-${category.id}`}
          role="region"
          aria-labelledby={`category-header-${category.id}`}
          className="px-4 bg-bg-elev"
        >
          {visibleItems.map((item) => (
            <KinkRow
              key={item.id}
              item={item}
              onRatingChange={onRatingChange}
              isPending={pendingItemIds.has(item.id)}
              lastSavedAt={recentlyUpdatedAt.get(item.id)}
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
  recentlyUpdatedAt: Map<string, number>;
  showOnlyUnrated: boolean;
}

export function KinkMatrix({
  matrix,
  onRatingChange,
  pendingItemIds,
  recentlyUpdatedAt,
  showOnlyUnrated,
}: Props) {
  if (matrix.categories.length === 0) {
    return (
      <p className="text-sm text-text-mute text-center py-10">
        No kink categories have been configured yet.
      </p>
    );
  }

  const categoriesToRender = matrix.categories
    .map((cat) => ({
      category: cat,
      visibleItems: showOnlyUnrated ? cat.items.filter((i) => i.rating === "not_set") : cat.items,
      totalItems: cat.items.length,
    }))
    .filter(({ visibleItems }) => visibleItems.length > 0);

  if (categoriesToRender.length === 0) {
    return (
      <p className="text-sm text-text-mute text-center py-10">All items have been rated.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {categoriesToRender.map(({ category, visibleItems, totalItems }) => (
        <CategorySection
          key={category.id}
          category={category}
          visibleItems={visibleItems}
          totalItems={totalItems}
          onRatingChange={onRatingChange}
          pendingItemIds={pendingItemIds}
          recentlyUpdatedAt={recentlyUpdatedAt}
        />
      ))}
    </div>
  );
}
