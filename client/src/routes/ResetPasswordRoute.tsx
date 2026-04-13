import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPasswordRoute() {
  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-base-text mb-6">Choose a new password</h2>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
