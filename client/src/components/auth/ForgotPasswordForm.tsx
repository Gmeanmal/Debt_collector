import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { requestPasswordResetApi } from "@/services/auth/authApi";

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
      <div className="text-center flex flex-col gap-4">
        <p className="text-base-text">
          If an account exists for that email, you will receive a reset link shortly.
        </p>
        <Link to="/login" className="text-sm text-pink-primary hover:text-pink-primary-hover">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-base-text-muted">
        Enter your email and we will send you a reset link.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-base-text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-status-danger">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm">
        <Link to="/login" className="text-pink-primary hover:text-pink-primary-hover">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
