import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JournalMoodSchema, type JournalMood } from "@/services/journal/journalApi";

const ACCEPTED_MIMES = "image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/webm";
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  onSubmit: (
    values: { body: string; mood: JournalMood; is_private: boolean },
    attachment: File | null,
  ) => void;
  isPending: boolean;
  error?: string | null;
}

const MOODS: { value: JournalMood; label: string; emoji: string }[] = [
  { value: "great", label: "Great", emoji: "😄" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "low", label: "Low", emoji: "😔" },
  { value: "bad", label: "Bad", emoji: "😞" },
  { value: "numb", label: "Numb", emoji: "😶" },
  { value: "overwhelmed", label: "Overwhelmed", emoji: "😰" },
];

const FormSchema = z.object({
  body: z.string().min(1, "Entry body is required"),
  mood: JournalMoodSchema,
});

export function JournalEntryForm({ onSubmit, isPending, error }: Props) {
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<JournalMood>("neutral");
  const [isPrivate, setIsPrivate] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAttachmentError(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (!ACCEPTED_MIMES.split(",").includes(file.type)) {
      setAttachmentError("File type not allowed.");
      setAttachment(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setAttachmentError("File must be under 10 MB.");
      setAttachment(null);
      return;
    }
    setAttachment(file);
  }

  function validate(): boolean {
    const result = FormSchema.safeParse({ body, mood });
    if (!result.success) {
      const bodyIssue = result.error.issues.find((i) => i.path[0] === "body");
      setBodyError(bodyIssue?.message ?? null);
      return false;
    }
    setBodyError(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ body, mood, is_private: isPrivate }, attachment);
    setBody("");
    setMood("neutral");
    setIsPrivate(false);
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-5"
    >
      <h2 className="text-sm font-semibold text-base-text">New entry</h2>

      <fieldset>
        <legend className="text-xs font-semibold text-base-text-muted mb-2 uppercase tracking-wide">
          How are you feeling?
        </legend>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(({ value, label, emoji }) => {
            const selected = mood === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMood(value)}
                aria-pressed={selected}
                aria-label={label}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                  selected
                    ? "border-pink-primary bg-pink-primary/10 text-pink-primary"
                    : "border-base-border bg-base-surface-raised text-base-text-muted hover:border-pink-primary/40 hover:text-pink-primary",
                )}
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="journal-body"
          className="text-xs font-semibold text-base-text-muted uppercase tracking-wide"
        >
          Entry
        </label>
        <textarea
          id="journal-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Write your entry here…"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
        {bodyError && <p className="text-xs text-status-danger">{bodyError}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="journal-attachment"
          className="text-xs font-semibold text-base-text-muted uppercase tracking-wide"
        >
          Attachment <span className="font-normal normal-case">(optional)</span>
        </label>
        <input
          ref={fileRef}
          id="journal-attachment"
          type="file"
          accept={ACCEPTED_MIMES}
          onChange={handleFileChange}
          className="text-sm text-base-text file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-base-border file:bg-base-surface-raised file:text-xs file:text-base-text-muted"
        />
        {attachmentError && <p className="text-xs text-status-danger">{attachmentError}</p>}
        {attachment && <p className="text-xs text-base-text-muted">{attachment.name}</p>}
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="mt-0.5 accent-pink-primary"
        />
        <span className="flex flex-col">
          <span className="text-sm text-base-text font-medium">Private (only me)</span>
          <span className="text-xs text-base-text-muted">
            Private entries stay hidden from your Goddess.
          </span>
        </span>
      </label>

      {error && <p className="text-xs text-status-danger">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} size="md">
          {isPending ? "Saving…" : "Add entry"}
        </Button>
      </div>
    </form>
  );
}
