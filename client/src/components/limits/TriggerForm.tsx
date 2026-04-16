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
import type { LimitSeverity } from "@/services/limits/limitsApi";

const formSchema = z.object({
  trigger_text: z.string().min(1, "Trigger description is required"),
  severity: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

interface TriggerFormProps {
  onSubmit: (values: { severity: LimitSeverity; trigger_text: string; notes: string | null }) => Promise<void>;
  isPending: boolean;
}

export function TriggerForm({ onSubmit, isPending }: TriggerFormProps) {
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<LimitSeverity>("medium");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = formSchema.safeParse({ trigger_text: text, severity, notes });
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
      trigger_text: result.data.trigger_text,
      severity: result.data.severity,
      notes: result.data.notes?.trim() || null,
    });
    setText("");
    setNotes("");
    setSeverity("medium");
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trigger-add-text">Trigger description</Label>
        <Input
          id="trigger-add-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Raised voices"
          maxLength={200}
        />
        {errors["trigger_text"] && (
          <p className="text-xs text-status-danger">{errors["trigger_text"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trigger-add-severity">Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as LimitSeverity)}>
          <SelectTrigger id="trigger-add-severity" aria-label="Trigger severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trigger-add-notes">Notes (optional)</Label>
        <textarea
          id="trigger-add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context…"
          rows={2}
          className="flex w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring resize-none"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add trigger"}
        </Button>
      </div>
    </form>
  );
}
