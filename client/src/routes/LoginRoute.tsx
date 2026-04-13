import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export function LoginRoute() {
  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-base-text mb-6">Sign in</h2>
      <LoginForm />
    </AuthLayout>
  );
}
