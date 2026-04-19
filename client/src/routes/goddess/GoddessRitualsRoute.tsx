import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmActionModal } from "@/components/shared/ConfirmActionModal";
import { AssignRitualModal } from "@/components/rituals/AssignRitualModal";
import {
  listGoddessRituals,
  pauseRitual,
  resumeRitual,
  deleteRitual,
  type RitualWithSubOut,
} from "@/api/rituals";
import { formatRitualSchedule } from "@/services/rituals/schedulePreview";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface RitualRowProps {
  ritual: RitualWithSubOut;
  onPauseToggle: (ritual: RitualWithSubOut) => void;
  onDelete: (ritual: RitualWithSubOut) => void;
  isPending: boolean;
}

function RitualRow({ ritual, onPauseToggle, onDelete, isPending }: RitualRowProps) {
  const schedule = formatRitualSchedule({
    frequency: ritual.frequency,
    custom_days_bitmask: ritual.custom_days_bitmask,
    deadline_time: ritual.deadline_time,
  });

  return (
    <article className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-semibold text-base-text">{ritual.title}</span>
          <span className="text-xs text-base-text-muted italic">{schedule}</span>
          {ritual.description && (
            <p className="text-xs text-base-text-muted leading-relaxed line-clamp-2">
              {ritual.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {ritual.paused && <Badge variant="warning">Paused</Badge>}
          {ritual.requires_proof && <Badge variant="info">Requires proof</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-border pt-3">
        <div className="flex flex-wrap gap-4 text-xs text-base-text-muted">
          <span>
            <span className="font-medium text-base-text">Complete:</span>{" "}
            <span className="text-status-success">+{ritual.points_on_complete} pts</span>
          </span>
          <span>
            <span className="font-medium text-base-text">Miss:</span>{" "}
            <span className="text-status-danger">{ritual.points_on_miss} pts</span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPauseToggle(ritual)}
            disabled={isPending}
            aria-label={ritual.paused ? "Resume ritual" : "Pause ritual"}
          >
            {ritual.paused ? "Resume" : "Pause"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(ritual)}
            disabled={isPending}
            aria-label="Delete ritual"
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

interface SubGroupProps {
  displayName: string;
  username: string;
  rituals: RitualWithSubOut[];
  onPauseToggle: (ritual: RitualWithSubOut) => void;
  onDelete: (ritual: RitualWithSubOut) => void;
  pendingId: string | null;
}

function SubGroup({
  displayName,
  username,
  rituals,
  onPauseToggle,
  onDelete,
  pendingId,
}: SubGroupProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-base-text">{displayName}</h2>
        <span className="text-xs text-base-text-muted">@{username}</span>
        <span className="ml-auto text-xs text-base-text-muted">
          {rituals.length} ritual{rituals.length !== 1 ? "s" : ""}
        </span>
      </header>
      <div className="flex flex-col gap-3">
        {rituals.map((r) => (
          <RitualRow
            key={r.id}
            ritual={r}
            onPauseToggle={onPauseToggle}
            onDelete={onDelete}
            isPending={pendingId === r.id}
          />
        ))}
      </div>
    </section>
  );
}

function groupBySub(rituals: RitualWithSubOut[]): Map<string, RitualWithSubOut[]> {
  const map = new Map<string, RitualWithSubOut[]>();
  for (const r of rituals) {
    const key = r.sub_id;
    const existing = map.get(key);
    if (existing) {
      existing.push(r);
    } else {
      map.set(key, [r]);
    }
  }
  return map;
}

export function GoddessRitualsRoute() {
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RitualWithSubOut | null>(null);

  const {
    data: rituals = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.goddess.rituals(),
    queryFn: listGoddessRituals,
  });

  const toggleMutation = useMutation({
    mutationFn: (ritual: RitualWithSubOut) =>
      ritual.paused ? resumeRitual(ritual.id) : pauseRitual(ritual.id),
    onMutate: (ritual) => setPendingId(ritual.id),
    onSettled: () => setPendingId(null),
    onSuccess: (_data, ritual) => {
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.rituals() });
      toast.success(ritual.paused ? "Ritual resumed" : "Ritual paused");
    },
    onError: () => toast.error("Failed to update ritual"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRitual(id),
    onMutate: (id) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.rituals() });
      setDeleteTarget(null);
      toast.success("Ritual deleted");
    },
    onError: () => toast.error("Failed to delete ritual"),
  });

  const grouped = groupBySub(rituals);

  return (
    <div className="px-4 py-10 sm:px-8 md:py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-primary/80">
              Assignments
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl italic leading-none text-base-text">
              Rituals.
            </h1>
            <p className="mt-3 text-sm text-base-text-muted max-w-xl">
              Recurring obligations assigned to your subs. Each ritual generates a daily occurrence
              that the sub must complete before the deadline.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAssign(true)}
            aria-label="Assign ritual"
            className={cn("shrink-0 mt-4 sm:mt-0")}
          >
            + Assign ritual
          </Button>
        </header>

        <Separator />

        {isLoading && <ListSkeleton rows={3} />}

        {isError && (
          <ErrorState
            title="Failed to load rituals"
            message={(error as Error | undefined)?.message ?? "Try refreshing the page."}
          />
        )}

        {!isLoading && !isError && rituals.length === 0 && (
          <EmptyState
            title="No rituals assigned yet."
            message="Use the form above to assign one."
          />
        )}

        {!isLoading && !isError && rituals.length > 0 && (
          <div className="flex flex-col gap-8">
            {Array.from(grouped.entries()).map(([subId, subRituals]) => {
              const first = subRituals[0]!;
              return (
                <SubGroup
                  key={subId}
                  displayName={first.sub_display_name}
                  username={first.sub_username}
                  rituals={subRituals}
                  onPauseToggle={(r) => toggleMutation.mutate(r)}
                  onDelete={setDeleteTarget}
                  pendingId={pendingId}
                />
              );
            })}
          </div>
        )}
      </div>

      {showAssign && <AssignRitualModal onClose={() => setShowAssign(false)} />}

      {deleteTarget && (
        <ConfirmActionModal
          kind="simple"
          title="Delete ritual"
          description={`Delete "${deleteTarget.title}"? All occurrences will be permanently removed.`}
          confirmLabel="Delete"
          isDestructive
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
