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
import { BrandLockup } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const REQUIRED_MARK = <span className="text-accent">*</span>;
const ERROR_CLASS = "font-mono text-[12px] text-bad-ink";

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
      navigate("/porch", { replace: true });
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
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[640px] flex flex-col items-center gap-10">
        <BrandLockup />

        <div className="w-full bg-bg-elev border border-line rounded-[10px] shadow-md p-6 sm:p-10 flex flex-col gap-7">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-deep">
              Create your account
            </p>
            <h1 className="font-serif italic text-[32px] leading-[1.05] tracking-[-0.01em] text-text">
              Claim your name.
            </h1>
            <p className="max-w-md text-[14.5px] leading-relaxed text-text-mute">
              A few details bind you to the ledger. Everything below stays between you and your
              goddess.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email {REQUIRED_MARK}</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className={ERROR_CLASS}>{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username {REQUIRED_MARK}</Label>
              <Input id="username" type="text" autoComplete="username" {...register("username")} />
              {errors.username && <p className={ERROR_CLASS}>{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  {...register("first_name")}
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  {...register("last_name")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password {REQUIRED_MARK}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && <p className={ERROR_CLASS}>{errors.password.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm_password">Confirm password {REQUIRED_MARK}</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className={ERROR_CLASS}>{errors.confirm_password.message}</p>
              )}
            </div>

            <div className="border-t border-line pt-5">
              <p className="mb-4 font-serif italic text-[13px] text-text-faint">
                Identity (timezone and date of birth required)
              </p>
              <div className="flex flex-col gap-5">
                <SignupIdentityFields register={register} errors={errors} />
              </div>
            </div>

            {errors.root && (
              <div className="rounded-[6px] border border-line bg-bad-bg px-4 py-3 text-center font-mono text-[12px] text-bad-ink">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full mt-2">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
          Mean Mal · The Ledger · Private quarters
        </p>
      </div>
    </div>
  );
}
