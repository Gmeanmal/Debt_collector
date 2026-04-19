import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { getMeApi, loginApi } from "@/services/auth/authApi";
import { setTokens } from "@/services/auth/tokenStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      setTokens({ access: pair.access_token });
      const me = await getMeApi();
      queryClient.setQueryData(["auth", "me"], me);
      navigate("/", { replace: true });
    } catch {
      setError("root", { message: "Invalid email or password." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Identity</Label>
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Passphrase</Label>
          <Link
            to="/forgot-password"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-deep decoration-accent/50 underline-offset-4 hover:text-accent hover:underline"
          >
            Forgotten?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="font-mono text-[12px] text-bad-ink">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <div className="rounded-[6px] border border-line bg-bad-bg px-4 py-3 text-sm text-bad-ink">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        className="group mt-2"
      >
        {isSubmitting ? "Entering…" : "Enter"}
        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}
