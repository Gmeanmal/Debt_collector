import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PorchGuard } from "@/components/layout/PorchGuard";
import { useAuth } from "@/services/auth/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Skip AppLayout — use for routes that supply their own full-screen shell. */
  noLayout?: boolean;
}

export function ProtectedRoute({ children, noLayout = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-bg flex items-center justify-center">
        <p className="text-base-text-muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (noLayout) {
    return <PorchGuard>{children}</PorchGuard>;
  }

  return (
    <PorchGuard>
      <AppLayout>{children}</AppLayout>
    </PorchGuard>
  );
}
