import { Navigate } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";

interface RoleProtectedRouteProps {
  role: "goddess" | "sub" | "admin";
  children: React.ReactNode;
}

export function RoleProtectedRoute({ role, children }: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}
