import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type OccurrenceWithRitual,
  todayRitualsKey,
  completeOccurrenceService,
  submitOccurrenceService,
  uploadEvidence,
} from "@/services/today/todayApi";

interface Props {
  data: OccurrenceWithRitual;
}

const STATUS_BADGE: Record<
  string,
  "default" | "warning" | "success" | "danger" | "info" | "primary"
> = {
  pending: "warning",
  completed: "success",
  submitted: "info",
  approved: "success",
  rejected: "danger",
  missed: "danger",
};

function DeadlineLabel({ deadlineTime }: { deadlineTime: string | null }) {
  if (!deadlineTime) return null;
  const [h, m] = deadlineTime.split(":").map(Number);
  const display = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return <span className="text-xs text-base-text-muted">Due by {display}</span>;
}

export function RitualCard({ data }: Props) {
  const { occurrence, ritual } = data;
  const ritualTitle = ritual.title;
  const ritualDescription = ritual.description;
  const deadlineTime = ritual.deadline_time;
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const isPending = occurrence.status === "pending";

  const completeMut = useMutation({
    mutationFn: () =>
      completeOccurrenceService(occurrence.id, {
        note: note.trim() || null,
        evidence_r2_key: evidenceKey,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todayRitualsKey });
    },
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitOccurrenceService(occurrence.id, {
        note: note.trim() || null,
        evidence_r2_key: evidenceKey,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todayRitualsKey });
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const key = await uploadEvidence(file);
      setEvidenceKey(key);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const busy = completeMut.isPending || submitMut.isPending || uploading;
  const actionError = completeMut.error ?? submitMut.error;

  return (
    <article className="bg-base-surface border border-base-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-base-text text-sm">{ritualTitle}</span>
          <DeadlineLabel deadlineTime={deadlineTime} />
        </div>
        <Badge variant={STATUS_BADGE[occurrence.status] ?? "default"}>
          {occurrence.status}
        </Badge>
      </div>

      {ritualDescription && (
        <p className="text-xs text-base-text-muted leading-relaxed">{ritualDescription}</p>
      )}

      {isPending && (
        <div className="flex flex-col gap-2 pt-1 border-t border-base-border">
          <Input
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            aria-label="Completion note"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              aria-label="Upload evidence photo"
            >
              {uploading ? "Uploading…" : evidenceKey ? "Photo attached" : "Attach photo"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </div>

          {uploadError && (
            <p className="text-xs text-status-danger" role="alert">
              {uploadError}
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => completeMut.mutate()}
              aria-label={`Mark ${ritualTitle} as complete`}
            >
              {completeMut.isPending ? "Saving…" : "Complete"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => submitMut.mutate()}
              aria-label={`Submit ${ritualTitle} for review`}
            >
              {submitMut.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </div>

          {actionError && (
            <p className="text-xs text-status-danger" role="alert">
              {(actionError as Error).message}
            </p>
          )}
        </div>
      )}

      {occurrence.note && !isPending && (
        <p className="text-xs text-base-text-muted italic">"{occurrence.note}"</p>
      )}
    </article>
  );
}
