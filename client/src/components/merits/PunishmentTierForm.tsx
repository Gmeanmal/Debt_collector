import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PunishmentTierInSchema,
  type PunishmentTier,
  type PunishmentTierIn,
} from "@/services/merits/meritsApi";

interface Props {
  initial?: Partial<PunishmentTier>;
  onSubmit: (values: PunishmentTierIn) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

function fieldError(errors: Record<string, string>, field: string): string | undefined {
  return errors[field];
}

export function PunishmentTierForm({ initial, onSubmit, onCancel, isPending, error }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [penalty, setPenalty] = useState(
    initial?.default_points_penalty != null ? String(initial.default_points_penalty) : "0",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): PunishmentTierIn | null {
    const result = PunishmentTierInSchema.safeParse({
      name,
      description: description || null,
      default_points_penalty: penalty === "" ? 0 : Number(penalty),
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
        <label
          htmlFor="pt-name"
          className="text-xs font-semibold text-text-mute uppercase tracking-wide"
        >
          Name
        </label>
        <input
          id="pt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Missed check-in penalty"
          className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {fieldError(errors, "name") && (
          <p className="text-xs text-bad-ink">{fieldError(errors, "name")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="pt-desc"
          className="text-xs font-semibold text-text-mute uppercase tracking-wide"
        >
          Description <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          id="pt-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="pt-penalty"
          className="text-xs font-semibold text-text-mute uppercase tracking-wide"
        >
          Points penalty (zero or negative)
        </label>
        <input
          id="pt-penalty"
          type="number"
          max={0}
          step={1}
          value={penalty}
          onChange={(e) => setPenalty(e.target.value)}
          placeholder="-10"
          className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {fieldError(errors, "default_points_penalty") && (
          <p className="text-xs text-bad-ink">{fieldError(errors, "default_points_penalty")}</p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-accent"
          aria-label="Active"
        />
        <span className="text-sm text-text">Active (can be invoked)</span>
      </label>

      {error && <p className="text-xs text-bad-ink">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
