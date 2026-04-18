import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { GoddessCommentForm } from "@/components/journal/GoddessCommentForm";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { listGoddessSubsApi, type GoddessSub } from "@/services/payments/paymentsApi";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import {
  goddessSubJournalKey,
  listSubJournalForGoddess,
  markJournalEntryRead,
  upsertJournalComment,
  type JournalEntry,
} from "@/services/journal/journalApi";
import { queryKeys } from "@/lib/queryKeys";

const PAGE_LIMIT = 20;

export function JournalReaderRoute() {
  const { username } = useParams<{ username?: string }>();
  const qc = useQueryClient();
  const [selectedSub, setSelectedSub] = useState<GoddessSub | null>(null);
  const selectedSubId = selectedSub?.id ?? "";
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<JournalEntry[][]>([]);
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});

  const { data: subs = [], isLoading: subsLoading } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  useEffect(() => {
    if (username && subs.length > 0 && selectedSub === null) {
      const found = subs.find((s) => s.username === username);
      if (found) setSelectedSub(found);
    }
  }, [username, subs, selectedSub]);

  const {
    data: entries = [],
    isLoading: entriesLoading,
    isError: entriesError,
    error: entriesErrorObj,
  } = useQuery({
    queryKey: [...goddessSubJournalKey(selectedSubId), { before: cursor, limit: PAGE_LIMIT }],
    queryFn: () => listSubJournalForGoddess(selectedSubId, { limit: PAGE_LIMIT, before: cursor }),
    enabled: !!selectedSubId,
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
      void qc.invalidateQueries({ queryKey: goddessSubJournalKey(selectedSubId) });
    },
    onError: (err, vars) => {
      const msg = err instanceof Error ? err.message : "Failed to save comment";
      setCommentErrors((prev) => ({ ...prev, [vars.entryId]: msg }));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: ({ entryId }: { entryId: string }) =>
      markJournalEntryRead(selectedSub?.username ?? "", entryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: goddessSubJournalKey(selectedSubId) });
    },
  });

  function handleSubChange(sub: GoddessSub | null) {
    setSelectedSub(sub);
    setCursor(null);
    setPages([]);
  }

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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-pink-primary tracking-wider">
            Journal
          </h1>
          <p className="text-sm text-base-text-muted mt-1">Read and comment on sub entries.</p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-base-text-muted uppercase tracking-wide">
            Sub
          </span>
          <SearchableSelect<GoddessSub>
            options={subs}
            value={selectedSub}
            onChange={handleSubChange}
            getLabel={(s) => `${s.display_name} @${s.username}`}
            getValue={(s) => s.id}
            placeholder={subsLoading ? "Loading subs…" : "Select a sub"}
            disabled={subsLoading}
            renderOption={(s) => (
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium text-base-text">
                    {s.display_name}
                  </span>
                  <span className="block truncate text-xs text-base-text-muted">@{s.username}</span>
                </span>
              </span>
            )}
          />
        </div>

        {!selectedSubId && (
          <EmptyState title="Select a sub" message="Choose a sub above to read their journal." />
        )}

        {selectedSubId && entriesLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-base-surface border border-base-border rounded-lg h-28 animate-pulse"
              />
            ))}
          </div>
        )}

        {selectedSubId && entriesError && (
          <ErrorState
            title="Failed to load journal"
            message={(entriesErrorObj as Error | undefined)?.message}
          />
        )}

        {selectedSubId && !entriesLoading && !entriesError && allEntries.length === 0 && (
          <EmptyState
            title="No entries yet"
            message={`${selectedSub?.display_name ?? "This sub"} has not written any journal entries.`}
          />
        )}

        {allEntries.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
