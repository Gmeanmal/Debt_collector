import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPasswordResetApi } from "@/services/auth/authApi";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (!token) {
      setError("root", { message: "Invalid or missing reset token" });
      return;
    }
    try {
      await confirmPasswordResetApi(token, values.password);
      setDone(true);
    } catch {
      setError("root", { message: "Reset link is invalid or has expired" });
    }
  }

  if (done) {
    return (
      <div className="text-center flex flex-col gap-4">
        <p className="text-base-text">Your password has been updated.</p>
        <Link to="/login" className="text-sm text-pink-primary hover:text-pink-primary-hover">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-base-text-muted">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-status-danger">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-base-text-muted">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
          {...register("confirm")}
        />
        {errors.confirm && <p className="text-sm text-status-danger">{errors.confirm.message}</p>}
      </div>

      {errors.root && (
        <p className="text-sm text-status-danger text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
