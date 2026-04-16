import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { signupViaInviteApi } from "@/services/invitations/invitationsApi";
import { setTokens } from "@/services/auth/tokenStorage";
import { queryKeys } from "@/lib/queryKeys";
import { SignupIdentityFields } from "@/components/signup/SignupIdentityFields";

function isAtLeast18(dob: string): boolean {
  const birth = new Date(dob);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return birth <= cutoff;
}

const signupSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    username: z.string().min(2, "Username must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    timezone: z.string().min(1, "Timezone is required"),
    date_of_birth: z
      .string()
      .min(1, "Date of birth is required")
      .refine(isAtLeast18, { message: "You must be at least 18 years old" }),
    gender: z.string().max(64).optional(),
    pronouns: z.string().max(64).optional(),
    location: z.string().max(120).optional(),
    real_name: z.string().max(200).optional(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof signupSchema>;

const INPUT_CLASS =
  "bg-base-surface-raised border border-base-border rounded-md px-3 py-2 text-base-text placeholder:text-base-text-subtle focus:outline-none focus:ring-2 focus:ring-pink-primary";

export function SignupRoute() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setValue("timezone", tz);
  }, [setValue]);

  async function onSubmit(values: FormValues) {
    if (!token) return;
    try {
      const pair = await signupViaInviteApi(token, {
        email: values.email,
        username: values.username,
        password: values.password,
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        timezone: values.timezone,
        date_of_birth: values.date_of_birth,
        gender: values.gender || null,
        pronouns: values.pronouns || null,
        location: values.location || null,
        real_name: values.real_name || null,
      });
      setTokens({ access: pair.access_token });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      navigate("/pending-entry-tribute", { replace: true });
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      const message = (err as { message?: string } | null)?.message;
      if (status === 409) {
        setError("root", { message: message || "Email or username already registered." });
      } else if (status === 404 || status === 410) {
        setError("root", { message: "This invitation is no longer valid." });
      } else if (status === 422) {
        setError("root", { message: message || "Validation failed. Check your details." });
      } else {
        setError("root", { message: message || "Signup failed. Please try again." });
      }
    }
  }

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-pink-primary tracking-wider">
            Debt Collector
          </h1>
        </div>
        <div className="bg-base-surface border border-base-border rounded-lg p-5 sm:p-8 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold text-base-text mb-6">Create your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-base-text-muted">
                Email <span className="text-status-danger">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={INPUT_CLASS}
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-status-danger">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-sm font-medium text-base-text-muted">
                Username <span className="text-status-danger">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className={INPUT_CLASS}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-status-danger">{errors.username.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="first_name" className="text-sm font-medium text-base-text-muted">
                  First name
                </label>
                <input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  className={INPUT_CLASS}
                  {...register("first_name")}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="last_name" className="text-sm font-medium text-base-text-muted">
                  Last name
                </label>
                <input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  className={INPUT_CLASS}
                  {...register("last_name")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-base-text-muted">
                Password <span className="text-status-danger">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={INPUT_CLASS}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-status-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium text-base-text-muted"
              >
                Confirm password <span className="text-status-danger">*</span>
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                className={INPUT_CLASS}
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-sm text-status-danger">{errors.confirm_password.message}</p>
              )}
            </div>

            <hr className="border-base-border" />
            <p className="text-xs text-base-text-muted -mb-2">
              Identity (timezone and date of birth required)
            </p>

            <SignupIdentityFields register={register} errors={errors} />

            {errors.root && (
              <p className="text-sm text-status-danger text-center">{errors.root.message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pink-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-pink-primary focus:ring-offset-2 focus:ring-offset-base-surface disabled:opacity-50"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
