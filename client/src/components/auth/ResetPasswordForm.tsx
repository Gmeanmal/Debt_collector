import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPasswordResetApi } from "@/services/auth/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text">Your password has been updated.</p>
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-deep decoration-accent/50 underline-offset-4 hover:text-accent hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="font-mono text-[12px] text-bad-ink">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          {...register("confirm")}
        />
        {errors.confirm && (
          <p className="font-mono text-[12px] text-bad-ink">{errors.confirm.message}</p>
        )}
      </div>

      {errors.root && (
        <div className="rounded-[6px] border border-line bg-bad-bg px-4 py-3 text-center text-sm text-bad-ink">
          {errors.root.message}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
