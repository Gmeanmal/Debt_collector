import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export function ResetPasswordRoute() {
  return (
    <AuthLayout
      title="Choose a new password."
      subtitle="Pick something only you would know."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
