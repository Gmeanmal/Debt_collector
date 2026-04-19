import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminCreate, adminUpdate } from "@/services/admin/adminApi";
import type { EntitySchema, FieldDef } from "@/services/admin/entitySchemas";
import { Button } from "@/components/ui/button";

interface AdminFormProps {
  schema: EntitySchema;
  mode: "create" | "edit";
  initialData: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

function stringifyInitial(value: unknown, kind: FieldDef["kind"]): string {
  if (value == null) return "";
  if (kind === "json") return JSON.stringify(value, null, 2);
  if (kind === "boolean") return value === true ? "true" : "false";
  return String(value);
}

function parseValue(kind: FieldDef["kind"], raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (kind === "number") {
    const n = Number(trimmed);
    if (Number.isNaN(n)) throw new Error("Invalid number");
    return n;
  }
  if (kind === "boolean") return trimmed === "true";
  if (kind === "json") {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      throw new Error("Invalid JSON");
    }
  }
  return trimmed;
}

function buildInitialFormState(
  schema: EntitySchema,
  data: Record<string, unknown> | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of schema.fields) {
    const raw = data?.[field.key];
    out[field.key] = field.kind === "password" ? "" : stringifyInitial(raw, field.kind);
  }
  return out;
}

export function AdminForm({ schema, mode, initialData, onClose, onSaved }: AdminFormProps) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    buildInitialFormState(schema, initialData),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialFormState(schema, initialData));
  }, [schema, initialData]);

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode === "create") return adminCreate(schema.entity, payload);
      const id = String(initialData?.id ?? "");
      return adminUpdate(schema.entity, id, payload);
    },
    onSuccess: onSaved,
    onError: (err: Error) => setError(err.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {};
    try {
      for (const field of schema.fields) {
        if (mode === "edit" && field.createOnly) continue;
        if (mode === "create" && field.editOnly) continue;
        const raw = form[field.key];
        if (raw === undefined) continue;
        if (field.kind === "password" && raw === "") continue;
        const value = parseValue(field.kind, raw);
        if (mode === "edit" && value === null) continue;
        payload[field.kind === "password" ? "password" : field.key] = value;
      }
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    mutation.mutate(payload);
  }

  return (
    <div
      className="fixed inset-0 bg-ink-400/55 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg-elev border border-line rounded-[10px] p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif italic text-lg text-text">
            {mode === "create" ? `New ${schema.label}` : `Edit ${schema.label}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-faint hover:text-text"
          >
            ×
          </button>
        </div>

        {mode === "edit" && initialData?.id != null && (
          <p className="font-mono text-[11px] text-text-faint tracking-[0.08em] mb-3">
            ID: {String(initialData.id)}
          </p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          {schema.fields.map((field) => {
            if (mode === "edit" && field.createOnly) return null;
            if (mode === "create" && field.editOnly) return null;
            const val = form[field.key] ?? "";
            return (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-[11px] text-text-faint tracking-[0.08em] uppercase">
                  {field.label}
                </span>
                {field.kind === "json" ? (
                  <textarea
                    rows={4}
                    value={val}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="px-3 py-2 bg-bg-sunken border border-line rounded-md text-text font-mono text-xs focus-visible:ring-2 focus-visible:ring-accent"
                  />
                ) : (
                  <input
                    type={field.kind === "password" ? "password" : "text"}
                    value={val}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="px-3 py-2 bg-bg-sunken border border-line rounded-md text-text focus-visible:ring-2 focus-visible:ring-accent"
                  />
                )}
              </label>
            );
          })}

          {error && <p className="text-sm text-bad-ink">{error}</p>}

          <div className="flex items-center gap-2 justify-end mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
