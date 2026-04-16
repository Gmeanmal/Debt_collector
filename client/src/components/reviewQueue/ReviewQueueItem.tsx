import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ReviewQueueItem } from "@/services/reviewQueue/reviewQueueApi";

const NOTE_TRUNCATE = 200;

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface Props {
  item: ReviewQueueItem;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function ReviewQueueItemCard({ item, selected, onToggle }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);

  const displayName = item.sub_display_name
    ? `${item.sub_display_name} (@${item.sub_username})`
    : `@${item.sub_username}`;

  const truncatedNote =
    item.note && item.note.length > NOTE_TRUNCATE
      ? `${item.note.slice(0, NOTE_TRUNCATE)}…`
      : item.note;

  const showExpandButton = (item.note?.length ?? 0) > NOTE_TRUNCATE;

  return (
    <div
      className={`bg-base-surface border rounded-lg p-4 flex flex-col gap-3 transition-colors ${
        selected ? "border-pink-primary" : "border-base-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(item.id)}
          aria-label={`Select ${item.title}`}
          className="mt-0.5 accent-pink-primary cursor-pointer"
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={item.kind === "ritual_occurrence" ? "primary" : "info"}>
              {item.kind === "ritual_occurrence" ? "Ritual" : "Task"}
            </Badge>
            <span className="text-sm font-semibold text-base-text truncate">{item.title}</span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-base-text-muted">
            <span>{displayName}</span>
            <span>·</span>
            <span>{formatSubmittedAt(item.submitted_at)}</span>
            <span>·</span>
            <span>{item.points_on_complete} pts</span>
          </div>

          {item.note && (
            <div className="text-xs text-base-text-subtle italic">
              {noteExpanded ? item.note : truncatedNote}
              {showExpandButton && (
                <button
                  type="button"
                  onClick={() => setNoteExpanded((v) => !v)}
                  className="ml-1 text-pink-primary underline-offset-2 hover:underline focus-visible:ring-1 focus-visible:ring-pink-primary rounded"
                >
                  {noteExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {item.evidence_presigned_url && (
            <img
              src={item.evidence_presigned_url}
              alt={`Evidence for ${item.title}`}
              loading="lazy"
              className="rounded max-h-48 w-auto object-contain border border-base-border"
            />
          )}
        </div>
      </div>
    </div>
  );
}
