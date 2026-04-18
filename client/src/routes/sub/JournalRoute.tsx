import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  subJournalKey,
  createJournalEntry,
  listOwnJournal,
  type JournalMood,
  type JournalEntry,
} from "@/services/journal/journalApi";

const PAGE_LIMIT = 20;

export function JournalRoute() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<JournalEntry[][]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    data: entries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...subJournalKey, { before: cursor, limit: PAGE_LIMIT }],
    queryFn: () => listOwnJournal({ limit: PAGE_LIMIT, before: cursor }),
  });

  const createMutation = useMutation({
    mutationFn: ({
      values,
      attachment,
    }: {
      values: { body: string; mood: JournalMood; is_private: boolean };
      attachment: File | null;
    }) => createJournalEntry(values, attachment),
    onSuccess: () => {
      setCursor(null);
      setPages([]);
      setCreateError(null);
      void qc.invalidateQueries({ queryKey: [...subJournalKey] });
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : "Failed to save entry");
    },
  });

  function handleCreate(
    values: { body: string; mood: JournalMood; is_private: boolean },
    attachment: File | null,
  ) {
    createMutation.mutate({ values, attachment });
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
          <p className="text-sm text-base-text-muted mt-1">
            Your private entries — append-only, seen only by you and your goddess.
          </p>
        </div>

        <JournalEntryForm
          onSubmit={handleCreate}
          isPending={createMutation.isPending}
          error={createError}
        />

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-base-surface border border-base-border rounded-lg h-28 animate-pulse"
              />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load journal"
            message={(error as Error | undefined)?.message}
          />
        )}

        {!isLoading && !isError && allEntries.length === 0 && (
          <EmptyState title="No entries yet" message="Write your first journal entry above." />
        )}

        {allEntries.length > 0 && (
          <div className="flex flex-col gap-4">
            {allEntries.map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
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
