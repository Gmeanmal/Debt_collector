import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LimitForm } from "@/components/limits/LimitForm";
import {
  editLimit,
  removeLimit,
  limitsKey,
  type LimitItem,
  type LimitKind,
  type LimitSeverity,
} from "@/services/limits/limitsApi";

interface LimitsListProps {
  items: LimitItem[];
}

const SEVERITY_VARIANT = {
  low: "info",
  medium: "warning",
  high: "danger",
} as const;

const KIND_VARIANT = {
  hard: "danger",
  soft: "default",
} as const;

function LimitRow({ item }: { item: LimitItem }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (vals: { kind: LimitKind; severity: LimitSeverity; label: string; notes: string | null }) =>
      editLimit(item.id, vals),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...limitsKey] });
      toast.success("Limit updated");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update limit"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeLimit(item.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...limitsKey] });
      toast.success("Limit deleted");
    },
    onError: () => toast.error("Failed to delete limit"),
  });

  if (editing) {
    return (
      <div className="rounded-md border border-pink-primary/30 bg-base-surface-raised/40 p-4">
        <LimitForm
          initial={item}
          onSubmit={async (vals) => { await updateMutation.mutateAsync(vals); }}
          onCancel={() => setEditing(false)}
          isPending={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-md border bg-base-surface-raised/30 p-4 transition-colors",
        item.kind === "hard" ? "border-status-danger/20" : "border-base-border/60",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-base-text font-medium leading-snug">{item.body.split("\n\n")[0]}</p>
        {item.body.includes("\n\n") && (
          <p className="mt-1 text-xs text-base-text-muted whitespace-pre-wrap">
            {item.body.split("\n\n").slice(1).join("\n\n")}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant={KIND_VARIANT[item.kind]}>{item.kind}</Badge>
          <Badge variant={SEVERITY_VARIANT[item.severity]}>{item.severity}</Badge>
          {item.acknowledged_by_goddess_at === null && (
            <Badge variant="warning">Awaiting acknowledge</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit limit"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete limit"
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

export function LimitsList({ items }: LimitsListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-base-text-subtle py-2">No limits recorded yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <LimitRow key={item.id} item={item} />
      ))}
    </div>
  );
}
