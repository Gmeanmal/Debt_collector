import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { RatingPicker } from "@/components/kinks/RatingPicker";
import type { KinkItem, KinkRating } from "@/services/kinks/kinksApi";

const CONFIRMATION_RATINGS: KinkRating[] = ["curious", "loves", "fetish_need"];

interface Props {
  item: KinkItem;
  onRatingChange: (itemId: string, rating: KinkRating) => void;
  isPending?: boolean;
}

export function KinkRow({ item, onRatingChange, isPending = false }: Props) {
  const [pendingRating, setPendingRating] = useState<KinkRating | null>(null);

  function handleRatingSelect(rating: KinkRating) {
    if (item.safety_flag && CONFIRMATION_RATINGS.includes(rating)) {
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
      <div className="flex items-start justify-between gap-3 py-2.5 border-b border-base-border last:border-0">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-base-text leading-snug">{item.label}</span>
            {item.needs_confirmation && (
              <AlertTriangle
                className="shrink-0 text-status-warning"
                size={14}
                aria-label="Safety-flagged item — requires care"
              />
            )}
            {item.is_custom && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-violet-muted text-violet-primary border border-violet-primary/20 leading-none">
                custom
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-base-text-subtle leading-snug line-clamp-2">
              {item.description}
            </p>
          )}
          {item.note && (
            <p className="text-xs text-base-text-muted italic leading-snug">"{item.note}"</p>
          )}
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
        <Modal title="Safety-flagged item" onClose={handleCancel} size="sm">
          <p className="text-sm text-base-text-muted">
            <strong className="text-base-text">{item.label}</strong> is marked as safety-critical.
            Selecting{" "}
            <strong className="text-status-warning">{pendingRating.replace("_", " ")}</strong> means
            you acknowledge the associated risks and require prior negotiation with your Goddess.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              I understand, confirm
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
