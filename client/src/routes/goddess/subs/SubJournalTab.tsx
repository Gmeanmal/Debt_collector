import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { GoddessCommentForm } from "@/components/journal/GoddessCommentForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import {
  goddessSubJournalKey,
  listSubJournalForGoddess,
  markJournalEntryRead,
  upsertJournalComment,
  type JournalEntry,
} from "@/services/journal/journalApi";

interface Props {
  subId: string;
  username: string;
}

const PAGE_LIMIT = 20;

export function SubJournalTab({ subId, username }: Props) {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<JournalEntry[][]>([]);
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...goddessSubJournalKey(subId), { before: cursor, limit: PAGE_LIMIT }],
    queryFn: () => listSubJournalForGoddess(subId, { limit: PAGE_LIMIT, before: cursor }),
    enabled: Boolean(subId),
  });

  const commentMutation = useMutation({
    mutationFn: ({ entryId, comment }: { entryId: string; comment: string }) =>
      upsertJournalComment(entryId, comment),
    onSuccess: (updated) => {
      setCommentErrors((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      void qc.invalidateQueries({ queryKey: goddessSubJournalKey(subId) });
    },
    onError: (err, vars) => {
      const msg = err instanceof Error ? err.message : "Failed to save comment";
      setCommentErrors((prev) => ({ ...prev, [vars.entryId]: msg }));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: ({ entryId }: { entryId: string }) => markJournalEntryRead(username, entryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goddessSubJournalKey(subId) });
    },
  });

  function loadNextPage() {
    const allSoFar = pages.flat().concat(entries);
    const oldest = allSoFar[allSoFar.length - 1];
    if (oldest) {
      setPages((prev) => [...prev, entries]);
      setCursor(oldest.created_at);
    }
  }

  const allEntries = pages.flat().concat(entries);
  const hasMore = entries.length === PAGE_LIMIT;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-elev border border-line rounded-[10px] h-28 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Failed to load journal" message={(error as Error | undefined)?.message} />
    );
  }

  if (allEntries.length === 0) {
    return (
      <EmptyState title="No entries yet" message="This sub has not written any journal entries." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {allEntries.map((entry) => (
        <JournalEntryCard
          key={entry.id}
          entry={entry}
          commentSlot={
            <div className="flex flex-col gap-3">
              {!entry.read_by_goddess_at && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markReadMutation.mutate({ entryId: entry.id })}
                    disabled={markReadMutation.isPending}
                  >
                    Mark as read
                  </Button>
                </div>
              )}
              <GoddessCommentForm
                entryId={entry.id}
                existingComment={entry.goddess_comment}
                onSubmit={(entryId, comment) => commentMutation.mutate({ entryId, comment })}
                isPending={commentMutation.isPending}
                error={commentErrors[entry.id]}
              />
            </div>
          }
        />
      ))}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
