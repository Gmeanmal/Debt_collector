import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";

// Routes reachable while status === "pending_entry_tribute"
const PORCH_ALLOWED_PATHS = ["/porch", "/sub/payments/new"];

interface PorchGuardProps {
  children: ReactNode;
}

export function PorchGuard({ children }: PorchGuardProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.status !== "pending_entry_tribute") {
    return <>{children}</>;
  }

  const allowed = PORCH_ALLOWED_PATHS.some((p) => location.pathname === p);
  if (!allowed) {
    return <Navigate to="/porch" replace />;
  }

  return <>{children}</>;
}
