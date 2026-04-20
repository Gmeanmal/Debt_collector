import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JournalEntry, JournalMood } from "@/services/journal/journalApi";
import { formatLondon } from "@/services/format/datetime";

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
  return formatLondon(iso, "datetime");
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AttachmentPreview({ url, mime }: { url: string; mime: string }) {
  if (mime.startsWith("image/")) {
    return (
      <img
        src={url}
        alt="Journal attachment"
        loading="lazy"
        className="rounded-md max-h-64 object-contain border border-line"
      />
    );
  }
  if (mime.startsWith("audio/")) {
    return <audio controls src={url} className="w-full" />;
  }
  return null;
}

export function JournalEntryCard({ entry, commentSlot }: Props) {
  const mood = entry.mood as JournalMood;

  return (
    <article
      className={cn("bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-3")}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <time dateTime={entry.created_at} className="font-mono text-[11px] text-text-faint">
          {formatTs(entry.created_at)}
        </time>
        <div className="flex flex-wrap items-center gap-2">
          {entry.read_by_goddess_at && (
            <span className="font-mono text-[11px] text-text-faint">
              Goddess read · {formatRelative(entry.read_by_goddess_at)}
            </span>
          )}
          <Badge variant={MOOD_VARIANT[mood]}>{MOOD_LABEL[mood]}</Badge>
        </div>
      </header>

      <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{entry.body}</p>

      {entry.attachment_presigned_url && entry.attachment_mime && (
        <AttachmentPreview url={entry.attachment_presigned_url} mime={entry.attachment_mime} />
      )}

      {entry.goddess_comment && (
        <div className="mt-1 border-t border-line pt-3 flex flex-col gap-1">
          <p className="text-xs font-semibold text-accent-deep uppercase tracking-wide">
            Goddess note
          </p>
          <p className="text-sm text-text-mute italic whitespace-pre-wrap">
            {entry.goddess_comment}
          </p>
          {entry.goddess_comment_at && (
            <time
              dateTime={entry.goddess_comment_at}
              className="font-mono text-[11px] text-text-faint"
            >
              {formatTs(entry.goddess_comment_at)}
            </time>
          )}
        </div>
      )}

      {commentSlot && <div className="mt-1 border-t border-line pt-3">{commentSlot}</div>}
    </article>
  );
}
