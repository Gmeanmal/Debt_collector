import { useQuery } from "@tanstack/react-query";
import {
  listOwnJournal,
  subJournalKey,
  type JournalEntry,
  type JournalMood,
} from "@/services/journal/journalApi";
import { formatLondon } from "@/services/format/datetime";
import { Badge } from "@/components/ui/badge";
import {
  LedgerSection,
  LedgerEmpty,
  LedgerError,
  LedgerLoading,
} from "@/components/ledger/LedgerSection";

const LEDGER_JOURNAL_LIMIT = 10;

const MOOD_LABEL: Record<JournalMood, string> = {
  great: "Great",
  good: "Good",
  neutral: "Neutral",
  low: "Low",
  bad: "Bad",
  numb: "Numb",
  overwhelmed: "Overwhelmed",
};

type BadgeVariant =
  | "neutral"
  | "ok"
  | "warn"
  | "bad"
  | "pink"
  | "ink"
  | "gold"
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "debt";

const MOOD_VARIANT: Record<JournalMood, BadgeVariant> = {
  great: "ok",
  good: "ok",
  neutral: "neutral",
  low: "warn",
  bad: "bad",
  numb: "neutral",
  overwhelmed: "bad",
};

function EntryCard({ entry }: { entry: JournalEntry }) {
  return (
    <article className="bg-bg-sunken border border-line rounded p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant={MOOD_VARIANT[entry.mood]}>{MOOD_LABEL[entry.mood]}</Badge>
          {entry.is_private && <Badge variant="neutral">Private</Badge>}
        </div>
        <span className="text-xs text-text-mute">{formatLondon(entry.created_at, "datetime")}</span>
      </div>
      <p className="text-sm text-text whitespace-pre-wrap">{entry.body}</p>
      {entry.read_by_goddess_at && (
        <p className="text-xs text-text-mute">
          Read by goddess on {formatLondon(entry.read_by_goddess_at, "datetime")}
        </p>
      )}
      {entry.goddess_comment && (
        <div className="border-l-2 border-accent pl-3 mt-1">
          <p className="text-xs text-text-mute uppercase tracking-wide mb-1">
            Goddess comment
            {entry.goddess_comment_at
              ? ` · ${formatLondon(entry.goddess_comment_at, "datetime")}`
              : ""}
          </p>
          <p className="text-sm text-text italic">{entry.goddess_comment}</p>
        </div>
      )}
    </article>
  );
}

export function JournalSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...subJournalKey, { before: null, limit: LEDGER_JOURNAL_LIMIT }],
    queryFn: () => listOwnJournal({ limit: LEDGER_JOURNAL_LIMIT, before: null }),
  });

  const entries = data ?? [];
  const mostRecent = entries[0]?.created_at;

  return (
    <LedgerSection title="Journal" updatedAt={mostRecent}>
      {isLoading && <LedgerLoading label="Loading recent entries…" />}
      {isError && <LedgerError message={(error as Error | undefined)?.message} />}
      {!isLoading && !isError && entries.length === 0 && (
        <LedgerEmpty message="No journal entries yet." />
      )}
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-mute">
            Showing the {entries.length} most recent entr{entries.length === 1 ? "y" : "ies"}.
          </p>
          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}
    </LedgerSection>
  );
}
