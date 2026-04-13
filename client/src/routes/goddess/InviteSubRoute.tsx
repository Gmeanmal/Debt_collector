import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createInvitationApi } from "@/services/invitations/invitationsApi";
import type { components } from "@/types/api.generated";

type InvitationOut = components["schemas"]["InvitationOut"];

const schema = z.object({
  entry_tribute_amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be a positive number"),
  note: z.string().optional(),
  expires_in_days: z.string().refine((v) => {
    const n = parseInt(v, 10);
    return !isNaN(n) && n >= 1 && n <= 30;
  }, "Must be between 1 and 30"),
});

type FormValues = z.infer<typeof schema>;

export function InviteSubRoute() {
  const [created, setCreated] = useState<InvitationOut | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { expires_in_days: "7" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result = await createInvitationApi({
        entry_tribute_amount: values.entry_tribute_amount,
        note: values.note ?? null,
        expires_in_days: parseInt(values.expires_in_days, 10),
      });
      setCreated(result);
      reset();
    } catch {
      setError("root", { message: "Failed to create invitation. Please try again." });
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>

        <div className="bg-base-surface border border-base-border rounded-lg p-8 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold text-base-text mb-6">Create Invitation</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="entry_tribute_amount"
                className="text-sm font-medium text-base-text-muted"
              >
                Entry tribute (£) <span className="text-status-danger">*</span>
              </label>
              <input
                id="entry_tribute_amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="£ amount"
                className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
                {...register("entry_tribute_amount")}
              />
              {errors.entry_tribute_amount && (
                <p className="text-sm text-status-danger">{errors.entry_tribute_amount.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="note" className="text-sm font-medium text-base-text-muted">
                Note <span className="text-base-text-subtle">(optional)</span>
              </label>
              <textarea
                id="note"
                rows={2}
                placeholder="Message for the sub…"
                className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary resize-none"
                {...register("note")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="expires_in_days" className="text-sm font-medium text-base-text-muted">
                Expires in (days)
              </label>
              <input
                id="expires_in_days"
                type="number"
                min={1}
                max={30}
                className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text focus:outline-none focus:ring-2 focus:ring-pink-primary"
                {...register("expires_in_days")}
              />
              {errors.expires_in_days && (
                <p className="text-sm text-status-danger">{errors.expires_in_days.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-status-danger text-center">{errors.root.message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create invitation"}
            </button>
          </form>
        </div>

        {created && (
          <div className="bg-base-surface border border-base-border rounded-lg p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium text-base-text-muted mb-2">Invitation URL</p>
            <p className="text-base-text break-all text-sm mb-4">{created.url}</p>
            <button
              onClick={() => copyUrl(created.url)}
              className="w-full bg-pink-muted text-pink-primary font-semibold py-2 px-4 rounded-md hover:bg-pink-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface"
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
