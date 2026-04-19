import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aftercareKey, saveOwnAftercare, type Aftercare } from "@/services/aftercare/aftercareApi";
import { Button } from "@/components/ui/button";

interface Props {
  initial: Aftercare;
}

interface FormState {
  needs: string;
  comfort_items: string;
  contact_phrase: string;
  notes: string;
  intensity: number;
}

function toFormState(aftercare: Aftercare): FormState {
  return {
    needs: aftercare.needs ?? "",
    comfort_items: aftercare.comfort_items ?? "",
    contact_phrase: aftercare.contact_phrase ?? "",
    notes: aftercare.notes ?? "",
    intensity: aftercare.intensity,
  };
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AftercareEditForm({ initial }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(toFormState(initial));
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      saveOwnAftercare({
        needs: form.needs.trim() || null,
        comfort_items: form.comfort_items.trim() || null,
        contact_phrase: form.contact_phrase.trim() || null,
        notes: form.notes.trim() || null,
        intensity: form.intensity,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(aftercareKey, updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function handleChange(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <Field
        id="needs"
        label="What I need after a scene"
        placeholder="Quiet time, a warm blanket, soft music…"
        value={form.needs}
        onChange={(v) => handleChange("needs", v)}
      />
      <Field
        id="comfort_items"
        label="Comfort items"
        placeholder="Stuffed animal, warm tea, weighted blanket…"
        value={form.comfort_items}
        onChange={(v) => handleChange("comfort_items", v)}
      />
      <Field
        id="contact_phrase"
        label="Ready phrase"
        placeholder="A phrase that signals you are grounded and ready to re-engage…"
        value={form.contact_phrase}
        onChange={(v) => handleChange("contact_phrase", v)}
      />
      <Field
        id="notes"
        label="Additional notes for your Goddess"
        placeholder="Please check in after 30 minutes…"
        value={form.notes}
        onChange={(v) => handleChange("notes", v)}
      />

      <IntensitySlider value={form.intensity} onChange={(v) => handleChange("intensity", v)} />

      {initial.read_by_goddess_at && (
        <p className="text-xs text-base-text-muted">
          Goddess read · {formatRelative(initial.read_by_goddess_at)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save aftercare profile"}
        </Button>
        {saved && <span className="text-sm text-status-success">Saved.</span>}
        {mutation.isError && (
          <span className="text-sm text-status-danger">{(mutation.error as Error).message}</span>
        )}
      </div>
    </form>
  );
}

interface IntensitySliderProps {
  value: number;
  onChange: (v: number) => void;
}

function IntensitySlider({ value, onChange }: IntensitySliderProps) {
  const helpId = "intensity-help";
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="intensity" className="text-sm font-medium text-base-text">
        Aftercare intensity —{" "}
        <span className="font-semibold text-pink-primary" role="status">
          {value}
        </span>
      </label>
      <input
        id="intensity"
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={helpId}
        className="w-full accent-pink-primary cursor-pointer"
      />
      <p id={helpId} className="text-xs text-base-text-muted">
        1 = gentle · 5 = intense
      </p>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}

function Field({ id, label, placeholder, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-base-text">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-base-border bg-base-surface px-3 py-2 text-sm text-base-text placeholder:text-base-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary resize-none"
      />
    </div>
  );
}
