import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleProtectedRoute } from "./RoleProtectedRoute";
import { AdminCronRoute } from "./admin/AdminCronRoute";
import { AdminRoute } from "./admin/AdminRoute";

function adminRoute(element: React.ReactElement): React.ReactElement {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute role="admin">{element}</RoleProtectedRoute>
    </ProtectedRoute>
  );
}

export const ADMIN_ROUTES: RouteObject[] = [
  { path: "/admin", element: adminRoute(<AdminRoute />) },
  { path: "/admin/cron", element: adminRoute(<AdminCronRoute />) },
];
