import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RewardTierInSchema, type RewardTier, type RewardTierIn } from "@/services/merits/meritsApi";

interface Props {
  initial?: Partial<RewardTier>;
  onSubmit: (values: RewardTierIn) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

function fieldError(
  errors: Record<string, string>,
  field: string,
): string | undefined {
  return errors[field];
}

export function RewardTierForm({ initial, onSubmit, onCancel, isPending, error }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): RewardTierIn | null {
    const result = RewardTierInSchema.safeParse({
      name,
      description: description || null,
      cost: cost === "" ? undefined : Number(cost),
      active,
    });
    if (!result.success) {
      const map: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        map[key] = issue.message;
      }
      setErrors(map);
      return null;
    }
    setErrors({});
    return result.data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = validate();
    if (!values) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="rw-name" className="text-xs font-semibold text-base-text-muted uppercase tracking-wide">
          Name
        </label>
        <input
          id="rw-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ten minutes of praise"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
        {fieldError(errors, "name") && (
          <p className="text-xs text-status-danger">{fieldError(errors, "name")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rw-desc" className="text-xs font-semibold text-base-text-muted uppercase tracking-wide">
          Description <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          id="rw-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rw-cost" className="text-xs font-semibold text-base-text-muted uppercase tracking-wide">
          Cost (points)
        </label>
        <input
          id="rw-cost"
          type="number"
          min={1}
          step={1}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="25"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-sm text-base-text focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
        {fieldError(errors, "cost") && (
          <p className="text-xs text-status-danger">{fieldError(errors, "cost")}</p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-pink-primary"
          aria-label="Active"
        />
        <span className="text-sm text-base-text">Active (subs can redeem)</span>
      </label>

      {error && <p className="text-xs text-status-danger">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
