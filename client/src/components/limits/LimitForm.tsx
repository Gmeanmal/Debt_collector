import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LimitItem, LimitKind, LimitSeverity } from "@/services/limits/limitsApi";

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  kind: z.enum(["hard", "soft"]),
  severity: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

interface LimitFormProps {
  initial?: LimitItem;
  onSubmit: (values: { kind: LimitKind; severity: LimitSeverity; label: string; notes: string | null }) => Promise<void>;
  onCancel?: () => void;
  isPending: boolean;
}

function fieldError(errors: Record<string, string>, field: string): string | undefined {
  return errors[field];
}

export function LimitForm({ initial, onSubmit, onCancel, isPending }: LimitFormProps) {
  const [label, setLabel] = useState(initial ? extractLabel(initial.body) : "");
  const [kind, setKind] = useState<LimitKind>(initial?.kind ?? "soft");
  const [severity, setSeverity] = useState<LimitSeverity>(initial?.severity ?? "medium");
  const [notes, setNotes] = useState(initial ? extractNotes(initial.body) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function extractLabel(body: string): string {
    return body.split("\n\n")[0] ?? body;
  }

  function extractNotes(body: string): string {
    const parts = body.split("\n\n");
    return parts.length > 1 ? parts.slice(1).join("\n\n") : "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = formSchema.safeParse({ label, kind, severity, notes });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    await onSubmit({
      kind: result.data.kind,
      severity: result.data.severity,
      label: result.data.label,
      notes: result.data.notes?.trim() || null,
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="limit-label">Label</Label>
        <Input
          id="limit-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. No breath play"
          maxLength={200}
        />
        {fieldError(errors, "label") && (
          <p className="text-xs text-status-danger">{fieldError(errors, "label")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit-kind">Kind</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as LimitKind)}>
            <SelectTrigger id="limit-kind" aria-label="Limit kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="soft">Soft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit-severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as LimitSeverity)}>
            <SelectTrigger id="limit-severity" aria-label="Limit severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="limit-notes">Notes (optional)</Label>
        <textarea
          id="limit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context…"
          rows={3}
          className="flex w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring disabled:opacity-50 resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : initial ? "Update limit" : "Add limit"}
        </Button>
      </div>
    </form>
  );
}
