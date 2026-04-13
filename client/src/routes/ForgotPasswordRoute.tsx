import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export function ForgotPasswordRoute() {
  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-base-text mb-6">Reset password</h2>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
