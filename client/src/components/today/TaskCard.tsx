import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type OpenTask,
  todayTasksKey,
  submitTaskService,
  uploadEvidence,
} from "@/services/today/todayApi";
import { formatLondon } from "@/services/format/datetime";

interface Props {
  task: OpenTask;
}

function formatDue(dueAt: string): string {
  return formatLondon(dueAt, "datetime");
}

const STATUS_BADGE: Record<string, "neutral" | "warn" | "ok" | "bad" | "pink" | "default"> = {
  open: "warn",
  submitted: "pink",
  approved: "ok",
  rejected: "bad",
  cancelled: "neutral",
};

export function TaskCard({ task }: Props) {
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const isOpen = task.status === "open";

  const submitMut = useMutation({
    mutationFn: () =>
      submitTaskService(task.id, {
        note: note.trim() || null,
        evidence_r2_key: evidenceKey,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: todayTasksKey });
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

  const busy = submitMut.isPending || uploading;

  return (
    <article className="bg-bg-elev border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="font-serif italic text-text text-sm">{task.title}</span>
        <Badge variant={STATUS_BADGE[task.status] ?? "neutral"}>{task.status}</Badge>
      </div>

      {task.description && (
        <p className="text-xs text-text-mute leading-relaxed">{task.description}</p>
      )}

      {task.due_at && (
        <p className="text-xs text-text-mute">
          Due <span className="text-text font-medium">{formatDue(task.due_at)}</span>
        </p>
      )}

      {isOpen && (
        <div className="flex flex-col gap-2 pt-1 border-t border-line">
          <Input
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            aria-label="Submission note"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              aria-label="Upload evidence photo for task"
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
            <p className="text-xs text-bad-ink" role="alert">
              {uploadError}
            </p>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={() => submitMut.mutate()}
            aria-label={`Submit task: ${task.title}`}
          >
            {submitMut.isPending ? "Submitting…" : "Submit for review"}
          </Button>

          {submitMut.error && (
            <p className="text-xs text-bad-ink" role="alert">
              {(submitMut.error as Error).message}
            </p>
          )}
        </div>
      )}

      {task.status === "submitted" && (
        <p className="text-xs text-accent-deep">Awaiting goddess review.</p>
      )}

      {task.status === "rejected" && task.rejection_reason && (
        <p className="text-xs text-bad-ink">{task.rejection_reason}</p>
      )}
    </article>
  );
}
