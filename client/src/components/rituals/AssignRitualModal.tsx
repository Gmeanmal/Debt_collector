import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { listGoddessSubsApi, type GoddessSub } from "@/services/payments/paymentsApi";
import { createRitualForSub, type RitualFrequency } from "@/api/rituals";
import { formatRitualSchedule } from "@/services/rituals/schedulePreview";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface DayChipsProps {
  value: number;
  onChange: (mask: number) => void;
}

function DayChips({ value, onChange }: DayChipsProps) {
  function toggle(i: number) {
    onChange(value ^ (1 << i));
  }
  return (
    <div className="flex flex-wrap gap-2">
      {DAY_LABELS.map((label, i) => {
        const active = Boolean(value & (1 << i));
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => toggle(i)}
            className={cn(
              "h-8 w-12 rounded-md border text-xs font-medium transition-colors",
              active
                ? "border-pink-primary bg-pink-primary/15 text-pink-primary"
                : "border-base-border bg-base-surface-raised text-base-text-muted hover:border-pink-primary/40",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface FormState {
  sub: GoddessSub | null;
  title: string;
  description: string;
  preset: "daily" | "weekly" | "custom";
  customMask: number;
  deadlineTime: string;
  requiresProof: boolean;
  pointsComplete: number;
  pointsMiss: number;
}

const INITIAL: FormState = {
  sub: null,
  title: "",
  description: "",
  preset: "daily",
  customMask: 0,
  deadlineTime: "23:59",
  requiresProof: false,
  pointsComplete: 1,
  pointsMiss: -1,
};

interface Props {
  onClose: () => void;
}

export function AssignRitualModal({ onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.goddess.subs(),
    queryFn: listGoddessSubsApi,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!form.sub) throw new Error("Sub required");
      const frequency: RitualFrequency = form.preset;
      return createRitualForSub(form.sub.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        frequency,
        custom_days_bitmask: frequency === "custom" ? (form.customMask || null) : null,
        deadline_time: form.deadlineTime ? `${form.deadlineTime}:00` : null,
        requires_proof: form.requiresProof,
        paused: false,
        points_on_complete: form.pointsComplete,
        points_on_miss: form.pointsMiss,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goddess.rituals() });
      toast.success("Ritual assigned");
      onClose();
    },
    onError: () => {
      toast.error("Failed to assign ritual");
    },
  });

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.sub) e.sub = "Select a sub";
    if (!form.title.trim()) e.title = "Title is required";
    if (form.title.trim().length > 200) e.title = "Max 200 characters";
    if (form.preset === "custom" && !form.customMask) e.customMask = "Select at least one day";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) mutation.mutate();
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const preview = formatRitualSchedule({
    frequency: form.preset,
    custom_days_bitmask: form.preset === "custom" ? form.customMask : null,
    deadline_time: form.deadlineTime ? `${form.deadlineTime}:00` : null,
  });

  return (
    <Modal title="Assign ritual" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-base-text">Sub</label>
          <SearchableSelect<GoddessSub>
            options={subs}
            value={form.sub}
            onChange={(v) => set("sub", v)}
            getValue={(s) => s.id}
            getLabel={(s) => s.display_name}
            placeholder="Pick a sub…"
            ariaLabel="Select sub"
            renderOption={(s) => (
              <span className="flex flex-col">
                <span className="text-sm text-base-text">{s.display_name}</span>
                <span className="text-xs text-base-text-muted">@{s.username}</span>
              </span>
            )}
          />
          {errors.sub && <p className="text-xs text-status-danger">{errors.sub}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ritual-title" className="text-xs font-medium text-base-text">
            Title
          </label>
          <input
            id="ritual-title"
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={200}
            placeholder="Morning devotion"
            className="h-10 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
          />
          {errors.title && <p className="text-xs text-status-danger">{errors.title}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ritual-description" className="text-xs font-medium text-base-text">
            Description
            <span className="ml-1 font-normal text-base-text-muted">(optional)</span>
          </label>
          <textarea
            id="ritual-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Visible to the sub"
            className="w-full resize-none rounded-md border border-base-border bg-base-surface-raised/60 px-3 py-2 text-sm text-base-text placeholder:text-base-text-subtle focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ritual-preset" className="text-xs font-medium text-base-text">
            Schedule
          </label>
          <select
            id="ritual-preset"
            value={form.preset}
            onChange={(e) => set("preset", e.target.value as FormState["preset"])}
            className="h-10 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (every Monday)</option>
            <option value="custom">Custom days</option>
          </select>
        </div>

        {form.preset === "custom" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-base-text">Days</span>
            <DayChips value={form.customMask} onChange={(m) => set("customMask", m)} />
            {errors.customMask && (
              <p className="text-xs text-status-danger">{errors.customMask}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="ritual-deadline" className="text-xs font-medium text-base-text">
              Deadline time
            </label>
            <input
              id="ritual-deadline"
              type="time"
              value={form.deadlineTime}
              onChange={(e) => set("deadlineTime", e.target.value)}
              className="h-10 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="ritual-pts-complete" className="text-xs font-medium text-base-text">
              Points on complete
            </label>
            <input
              id="ritual-pts-complete"
              type="number"
              value={form.pointsComplete}
              onChange={(e) => set("pointsComplete", Number(e.target.value))}
              className="h-10 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="ritual-pts-miss" className="text-xs font-medium text-base-text">
              Points on miss
            </label>
            <input
              id="ritual-pts-miss"
              type="number"
              value={form.pointsMiss}
              onChange={(e) => set("pointsMiss", Number(e.target.value))}
              className="h-10 w-full rounded-md border border-base-border bg-base-surface-raised/60 px-3 text-sm text-base-text focus:border-pink-primary/60 focus:outline-none focus:ring-2 focus:ring-pink-ring"
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-base-border bg-base-surface-raised/40 p-3">
          <input
            id="ritual-proof"
            type="checkbox"
            checked={form.requiresProof}
            onChange={(e) => set("requiresProof", e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-pink-primary)]"
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="ritual-proof" className="cursor-pointer text-sm font-medium text-base-text">
              Requires proof
            </label>
            <p className="text-xs text-base-text-muted">
              Sub must attach a photo to mark complete
            </p>
          </div>
        </div>

        <p className="text-xs text-base-text-muted italic">{preview}</p>

        <div className="flex gap-2 justify-end border-t border-base-border pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Assigning…" : "Assign ritual"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
