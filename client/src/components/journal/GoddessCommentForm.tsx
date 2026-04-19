import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  entryId: string;
  existingComment?: string | null;
  onSubmit: (entryId: string, comment: string) => void;
  isPending: boolean;
  error?: string | null;
}

export function GoddessCommentForm({
  entryId,
  existingComment,
  onSubmit,
  isPending,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(existingComment ?? "");
  const [commentError, setCommentError] = useState<string | null>(null);

  function validate(): boolean {
    if (!comment.trim()) {
      setCommentError("Comment cannot be empty");
      return false;
    }
    setCommentError(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(entryId, comment.trim());
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-accent-deep hover:underline focus-visible:ring-2 focus-visible:ring-accent rounded"
        aria-label={existingComment ? "Edit your comment" : "Add a comment"}
      >
        {existingComment ? "Edit comment" : "Add comment"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label
        htmlFor={`comment-${entryId}`}
        className="text-xs font-semibold text-text-faint uppercase tracking-wide"
      >
        Your comment
      </label>
      <textarea
        id={`comment-${entryId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Leave a note for your sub…"
        className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {commentError && <p className="text-xs text-bad-ink">{commentError}</p>}
      {error && <p className="text-xs text-bad-ink">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setComment(existingComment ?? "");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save comment"}
        </Button>
      </div>
    </form>
  );
}
