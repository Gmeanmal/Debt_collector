import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  PaymentMethodCreate,
  PaymentMethodOut,
} from "@/services/paymentMethods/paymentMethodsApi";
import {
  ALL_METHOD_TYPES,
  METHOD_LABELS,
  MethodIcon,
} from "@/components/paymentMethods/MethodIcon";

const PAYMENT_TYPES = ALL_METHOD_TYPES as readonly [
  (typeof ALL_METHOD_TYPES)[number],
  ...(typeof ALL_METHOD_TYPES)[number][],
];

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(PAYMENT_TYPES),
  handle_or_link: z.string().min(1, "Handle or link is required").max(500),
  note: z.string().max(1000).optional(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface PaymentMethodFormProps {
  initial?: PaymentMethodOut;
  onSubmit: (data: PaymentMethodCreate) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function PaymentMethodForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
}: PaymentMethodFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "throne",
      handle_or_link: "",
      note: "",
      enabled: true,
    },
  });

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        type: initial.type,
        handle_or_link: initial.handle_or_link,
        note: initial.note ?? "",
        enabled: initial.enabled,
      });
    }
  }, [initial, reset]);

  function onValid(data: FormValues) {
    onSubmit({
      name: data.name,
      type: data.type,
      handle_or_link: data.handle_or_link,
      note: data.note || null,
      enabled: data.enabled,
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text-muted" htmlFor="pm-name">
          Display name
        </label>
        <input
          id="pm-name"
          {...register("name")}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus:ring-2 focus:ring-pink-primary"
          placeholder="Throne — jane-mm"
        />
        {errors.name && <p className="text-status-danger text-xs">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text-muted" htmlFor="pm-type">
          Type
        </label>
        <div className="flex items-center gap-3">
          <MethodIcon type={watch("type")} size="md" />
          <select
            id="pm-type"
            {...register("type")}
            className="flex-1 bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus:ring-2 focus:ring-pink-primary"
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {METHOD_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        {errors.type && <p className="text-status-danger text-xs">{errors.type.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text-muted" htmlFor="pm-handle">
          Handle or link
        </label>
        <input
          id="pm-handle"
          {...register("handle_or_link")}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus:ring-2 focus:ring-pink-primary"
          placeholder="@jane-mm or https://..."
        />
        {errors.handle_or_link && (
          <p className="text-status-danger text-xs">{errors.handle_or_link.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-base-text-muted" htmlFor="pm-note">
          Note (optional)
        </label>
        <textarea
          id="pm-note"
          {...register("note")}
          rows={2}
          className="bg-base-surface-raised border border-base-border rounded px-3 py-2 text-base-text text-sm focus:outline-none focus:ring-2 focus:ring-pink-primary resize-none"
          placeholder="Internal note…"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="pm-enabled"
          type="checkbox"
          {...register("enabled")}
          className="accent-pink-primary w-4 h-4"
        />
        <label className="text-sm font-medium text-base-text-muted" htmlFor="pm-enabled">
          Enabled
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border border-base-border text-base-text-muted hover:text-base-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm rounded bg-pink-primary text-pink-foreground font-semibold hover:bg-pink-primary-hover disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
