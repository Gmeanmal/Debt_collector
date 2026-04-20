import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { createInvitationApi } from "@/services/invitations/invitationsApi";
import type { components } from "@/types/api.generated";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

type InvitationOut = components["schemas"]["InvitationOut"];

const schema = z.object({
  entry_tribute_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a GBP value with up to 2 decimals")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
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
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
        <PageHeader
          crumbs={["Home · Gatekeeping · Invite"]}
          title={<span className="italic">New invitation</span>}
          description="Draft an invite link for a new sub."
        />

        <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="entry_tribute_amount" className="text-sm font-medium text-text-mute">
                Entry tribute <span className="text-bad-ink">*</span>
              </label>
              <div className="flex items-center bg-bg-sunken border border-line rounded-md focus-within:ring-2 focus-within:ring-accent">
                <span className="pl-3 text-text-mute select-none">£</span>
                <input
                  id="entry_tribute_amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="flex-1 bg-transparent outline-none px-2 py-2 text-text placeholder:text-text-faint"
                  {...register("entry_tribute_amount")}
                />
              </div>
              {errors.entry_tribute_amount && (
                <p className="text-sm text-bad-ink">{errors.entry_tribute_amount.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="note" className="text-sm font-medium text-text-mute">
                Note <span className="text-text-faint">(optional)</span>
              </label>
              <textarea
                id="note"
                rows={2}
                placeholder="Message for the sub…"
                className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                {...register("note")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="expires_in_days" className="text-sm font-medium text-text-mute">
                Expires in (days)
              </label>
              <input
                id="expires_in_days"
                type="number"
                min={1}
                max={30}
                className="bg-bg-sunken border border-line rounded-md px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent"
                {...register("expires_in_days")}
              />
              {errors.expires_in_days && (
                <p className="text-sm text-bad-ink">{errors.expires_in_days.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-bad-ink text-center">{errors.root.message}</p>
            )}

            <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
              {isSubmitting && (
                <span className="inline-block w-3 h-3 border-2 border-accent-ink/30 border-t-accent-ink rounded-full animate-spin" />
              )}
              {isSubmitting ? "Creating…" : "Create invitation"}
            </Button>
          </form>
        </div>

        {created && (
          <div className="bg-bg-elev border border-line rounded-[10px] p-[18px]">
            <p className="text-sm font-medium text-text-mute mb-2">Invitation URL</p>
            <p className="text-text break-all text-sm mb-4">{created.url}</p>
            <Button
              type="button"
              variant="soft"
              onClick={() => copyUrl(created.url)}
              className="w-full"
            >
              {copied ? "Copied!" : "Copy URL"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
