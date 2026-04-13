import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getMeApi, loginApi } from "@/services/auth/authApi";
import { setTokens } from "@/services/auth/tokenStorage";

const schema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const pair = await loginApi({ email: values.email, password: values.password });
      setTokens({ access: pair.access_token, refresh: pair.refresh_token });
      const me = await getMeApi();
      queryClient.setQueryData(["auth", "me"], me);
      navigate("/", { replace: true });
    } catch {
      setError("root", { message: "Invalid email or password" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-base-text-muted">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary"
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-status-danger">{errors.password.message}</p>}
      </div>

      {errors.root && (
        <p className="text-sm text-status-danger text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-base-text-muted">
        <Link to="/forgot-password" className="text-pink-primary hover:text-pink-primary-hover">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
