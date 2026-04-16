import { useState } from "react";
import { ToyCreateSchema, ToyCategorySchema } from "@/services/toys/toysApi";
import type { ToyCategory, ToyCreateInput, ToyItem } from "@/services/toys/toysApi";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: ToyCategory; label: string }[] = [
  { value: "collar", label: "Collar" },
  { value: "restraint", label: "Restraint" },
  { value: "impact", label: "Impact" },
  { value: "cage", label: "Cage" },
  { value: "vibrator", label: "Vibrator" },
  { value: "plug", label: "Plug" },
  { value: "gag", label: "Gag" },
  { value: "clothing", label: "Clothing" },
  { value: "other", label: "Other" },
];

interface Props {
  initial?: ToyItem;
  isPending: boolean;
  isError: boolean;
  submitLabel: string;
  onSubmit: (input: ToyCreateInput) => void;
  onCancel: () => void;
}

interface FieldErrors {
  name?: string;
  category?: string;
}

export function ToyForm({
  initial,
  isPending,
  isError,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ToyCategory>(
    initial?.category ?? "other",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(): ToyCreateInput | null {
    const result = ToyCreateSchema.safeParse({
      name: name.trim(),
      category,
      description: description.trim() || null,
      photo_r2_key: null,
    });

    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === "name") errs.name = issue.message;
        if (field === "category") errs.category = issue.message;
      }
      setFieldErrors(errs);
      return null;
    }

    setFieldErrors({});
    return result.data;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = validate();
    if (!input) return;
    onSubmit(input);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-surface border border-base-border rounded-lg p-5 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="toy-name" className="text-sm font-semibold text-base-text">
          Name
        </label>
        <input
          id="toy-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Leather wrist cuffs"
          maxLength={200}
          className={cn(
            "bg-base-surface-raised border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
            fieldErrors.name ? "border-status-danger" : "border-base-border",
          )}
        />
        {fieldErrors.name && (
          <p className="text-xs text-status-danger">{fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="toy-category" className="text-sm font-semibold text-base-text">
          Category
        </label>
        <select
          id="toy-category"
          value={category}
          onChange={(e) => {
            const parsed = ToyCategorySchema.safeParse(e.target.value);
            if (parsed.success) setCategory(parsed.data);
          }}
          className={cn(
            "bg-base-surface-raised border rounded-md px-3 py-2 text-base-text text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary",
            fieldErrors.category ? "border-status-danger" : "border-base-border",
          )}
        >
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldErrors.category && (
          <p className="text-xs text-status-danger">{fieldErrors.category}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="toy-description" className="text-sm font-semibold text-base-text">
          Description{" "}
          <span className="text-base-text-subtle font-normal">(optional)</span>
        </label>
        <textarea
          id="toy-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Colour, size, safety notes…"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary"
        />
      </div>

      {/* Photo upload deferred — B4 presigned upload URL not yet wired to toy endpoints */}
      {/* TODO: wire photo upload once B4 presigned PUT URL is surfaced for toys */}

      {isError && (
        <p className="text-xs text-status-danger">Failed to save. Please try again.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 text-sm text-base-text-muted border border-base-border rounded-md hover:text-base-text transition-colors focus-visible:ring-2 focus-visible:ring-base-border"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-4 py-2 text-sm bg-pink-primary text-pink-foreground font-semibold rounded-md hover:bg-pink-primary-hover transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-pink-primary"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
