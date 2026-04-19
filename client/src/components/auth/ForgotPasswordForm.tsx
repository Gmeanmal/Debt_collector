import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { requestPasswordResetApi } from "@/services/auth/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().min(1, "Email is required"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await requestPasswordResetApi(values.email);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text">
          If an account exists for that email, you will receive a reset link shortly.
        </p>
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-deep decoration-accent/50 underline-offset-4 hover:text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <p className="text-sm text-text-mute">
        Enter your email and we will send you a reset link.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@quarters.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="font-mono text-[12px] text-bad-ink">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        className="mt-2"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center">
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-deep decoration-accent/50 underline-offset-4 hover:text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
