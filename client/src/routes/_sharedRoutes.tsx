import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { ContractDetailRoute } from "./ContractDetailRoute";
import { ProfileRoute } from "./ProfileRoute";

export const SHARED_ROUTES: RouteObject[] = [
  {
    path: "/debts/:slug",
    element: (
      <ProtectedRoute>
        <ContractDetailRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfileRoute />
      </ProtectedRoute>
    ),
  },
];
