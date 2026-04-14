import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export function LoginRoute() {
  return (
    <AuthLayout title="Sign in." subtitle="Continue your reign over the ledger.">
      <LoginForm />
    </AuthLayout>
  );
}
