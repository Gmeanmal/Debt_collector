import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JournalEntry, JournalMood } from "@/services/journal/journalApi";

interface Props {
  entry: JournalEntry;
  commentSlot?: React.ReactNode;
}

const MOOD_LABEL: Record<JournalMood, string> = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  low: "Low",
  bad: "Bad",
  numb: "Numb",
  overwhelmed: "Overwhelmed",
};

const MOOD_VARIANT: Record<
  JournalMood,
  "success" | "primary" | "default" | "warning" | "danger" | "info"
> = {
  great: "success",
  good: "success",
  neutral: "default",
  low: "warning",
  bad: "danger",
  numb: "info",
  overwhelmed: "danger",
};

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function JournalEntryCard({ entry, commentSlot }: Props) {
  const mood = entry.mood as JournalMood;

  return (
    <article
      className={cn("bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-3")}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <time dateTime={entry.created_at} className="text-xs text-base-text-muted">
          {formatTs(entry.created_at)}
        </time>
        <Badge variant={MOOD_VARIANT[mood]}>{MOOD_LABEL[mood]}</Badge>
      </header>

      <p className="text-sm text-base-text whitespace-pre-wrap leading-relaxed">{entry.body}</p>

      {/* TODO: render attached photo when R2 signed URL integration is added */}

      {entry.goddess_comment && (
        <div className="mt-1 border-t border-base-border pt-3 flex flex-col gap-1">
          <p className="text-xs font-semibold text-pink-primary uppercase tracking-wide">
            Goddess note
          </p>
          <p className="text-sm text-base-text-muted italic whitespace-pre-wrap">
            {entry.goddess_comment}
          </p>
          {entry.goddess_comment_at && (
            <time dateTime={entry.goddess_comment_at} className="text-xs text-base-text-subtle">
              {formatTs(entry.goddess_comment_at)}
            </time>
          )}
        </div>
      )}

      {commentSlot && <div className="mt-1 border-t border-base-border pt-3">{commentSlot}</div>}
    </article>
  );
}
