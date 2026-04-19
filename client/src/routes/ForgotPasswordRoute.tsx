import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export function ForgotPasswordRoute() {
  return (
    <AuthLayout
      title="Reset password."
      subtitle="We will send a link to your email if it matches an account."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
