import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsentAckModal } from "@/components/kinks/ConsentAckModal";
import { RatingPicker } from "@/components/kinks/RatingPicker";
import type { KinkItem, KinkRating } from "@/services/kinks/kinksApi";

const RECENCY_WINDOW_MS = 6000;

interface SaveIndicatorProps {
  isPending: boolean;
  lastSavedAt: number | undefined;
}

function SaveIndicator({ isPending, lastSavedAt }: SaveIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lastSavedAt === undefined) return;
    if (Date.now() - lastSavedAt >= RECENCY_WINDOW_MS) return;

    const id = setInterval(() => {
      const ts = Date.now();
      if (ts - lastSavedAt >= RECENCY_WINDOW_MS) {
        clearInterval(id);
      }
      setNow(ts);
    }, 1000);

    return () => clearInterval(id);
  }, [lastSavedAt]);

  if (isPending) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-faint">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }

  if (lastSavedAt !== undefined && now - lastSavedAt < RECENCY_WINDOW_MS) {
    const elapsed = Math.round((now - lastSavedAt) / 1000);
    return (
      <span className="text-xs text-ok-ink" role="status">
        Saved · {elapsed}s ago
      </span>
    );
  }

  return null;
}

interface Props {
  item: KinkItem;
  onRatingChange: (itemId: string, rating: KinkRating) => void;
  isPending?: boolean;
  lastSavedAt?: number;
}

export function KinkRow({ item, onRatingChange, isPending = false, lastSavedAt }: Props) {
  const [pendingRating, setPendingRating] = useState<"loves" | "fetish_need" | null>(null);

  function handleRatingSelect(rating: KinkRating) {
    if (item.safety_flag && (rating === "loves" || rating === "fetish_need")) {
      setPendingRating(rating);
      return;
    }
    onRatingChange(item.id, rating);
  }

  function handleConfirm() {
    if (pendingRating) {
      onRatingChange(item.id, pendingRating);
    }
    setPendingRating(null);
  }

  function handleCancel() {
    setPendingRating(null);
  }

  return (
    <>
      <div
        className={cn(
          "flex items-start justify-between gap-3 py-2.5 border-b border-line last:border-0",
          "hover:bg-bg-sunken transition-colors duration-100",
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-text leading-snug">{item.label}</span>
            {item.safety_flag && (
              <AlertTriangle
                className="shrink-0 text-warn-ink"
                size={14}
                aria-label="Safety-flagged item — requires care"
              />
            )}
            {item.is_custom && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-accent-trace text-accent-deep border border-accent/20 leading-none">
                custom
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-text-faint leading-snug line-clamp-2">{item.description}</p>
          )}
          {item.note && <p className="text-xs text-text-mute italic leading-snug">"{item.note}"</p>}
          <SaveIndicator isPending={isPending} lastSavedAt={lastSavedAt} />
        </div>
        <div className="shrink-0">
          <RatingPicker
            value={item.rating}
            onChange={handleRatingSelect}
            compact
            disabled={isPending}
          />
        </div>
      </div>

      {pendingRating !== null && (
        <ConsentAckModal
          itemLabel={item.label}
          pendingRating={pendingRating}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
