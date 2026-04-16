import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
import {
  editTrigger,
  removeTrigger,
  triggersKey,
  type TriggerItem,
  type LimitSeverity,
} from "@/services/limits/limitsApi";

interface TriggersListProps {
  items: TriggerItem[];
}

const SEVERITY_VARIANT = {
  low: "info",
  medium: "warning",
  high: "danger",
} as const;

const triggerEditSchema = z.object({
  trigger_text: z.string().min(1, "Trigger text is required"),
  severity: z.enum(["low", "medium", "high"]),
  notes: z.string().optional(),
});

interface TriggerEditFormProps {
  item: TriggerItem;
  onDone: () => void;
}

function TriggerEditForm({ item, onDone }: TriggerEditFormProps) {
  const [text, setText] = useState(item.trigger_text);
  const [severity, setSeverity] = useState<LimitSeverity>(item.severity);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (vals: { trigger_text: string; severity: LimitSeverity; notes: string | null }) =>
      editTrigger(item.id, vals),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...triggersKey] });
      toast.success("Trigger updated");
      onDone();
    },
    onError: () => toast.error("Failed to update trigger"),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = triggerEditSchema.safeParse({ trigger_text: text, severity, notes });
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
    await updateMutation.mutateAsync({
      trigger_text: result.data.trigger_text,
      severity: result.data.severity,
      notes: result.data.notes?.trim() || null,
    });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trigger-text">Trigger</Label>
        <Input
          id="trigger-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
        />
        {errors["trigger_text"] && (
          <p className="text-xs text-status-danger">{errors["trigger_text"]}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trigger-severity">Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as LimitSeverity)}>
          <SelectTrigger id="trigger-severity" aria-label="Trigger severity">
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
        <Label htmlFor="trigger-notes">Notes (optional)</Label>
        <textarea
          id="trigger-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border border-base-border bg-base-surface-raised/60 px-4 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring resize-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={updateMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving…" : "Update trigger"}
        </Button>
      </div>
    </form>
  );
}

function TriggerRow({ item }: { item: TriggerItem }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => removeTrigger(item.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...triggersKey] });
      toast.success("Trigger deleted");
    },
    onError: () => toast.error("Failed to delete trigger"),
  });

  if (editing) {
    return (
      <div className="rounded-md border border-pink-primary/30 bg-base-surface-raised/40 p-4">
        <TriggerEditForm item={item} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-md border border-base-border/60 bg-base-surface-raised/30 p-4 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-base-text font-medium leading-snug">{item.trigger_text}</p>
        {item.notes && (
          <p className="mt-1 text-xs text-base-text-muted whitespace-pre-wrap">{item.notes}</p>
        )}
        <div className="mt-2">
          <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit trigger"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete trigger"
          onClick={() => void deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="text-status-danger hover:text-status-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function TriggersList({ items }: TriggersListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-base-text-subtle py-2">No triggers recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <TriggerRow key={item.id} item={item} />
      ))}
    </div>
  );
}
