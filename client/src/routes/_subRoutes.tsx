import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleProtectedRoute } from "./RoleProtectedRoute";
import { PorchRoute } from "./sub/PorchRoute";
import { PaymentFormRoute } from "./sub/PaymentFormRoute";
import { PaymentHistoryRoute } from "./sub/PaymentHistoryRoute";
import { SubContractsRoute } from "./sub/SubContractsRoute";
import { ProposeContractRoute } from "./sub/ProposeContractRoute";
import { ContractSignRoute } from "./sub/ContractSignRoute";
import { PendingAdjustmentsRoute } from "./sub/PendingAdjustmentsRoute";
import { SubDashboardRoute } from "./sub/DashboardRoute";
import { KinksRoute } from "./profile/KinksRoute";
import { LimitsRoute } from "./profile/LimitsRoute";
import { TodayRoute } from "./sub/TodayRoute";
import { JournalRoute } from "./sub/JournalRoute";
import { InventoryRoute as SubInventoryRoute } from "./sub/InventoryRoute";
import { AftercareRoute } from "./profile/AftercareRoute";
import { MedicalRoute } from "./profile/MedicalRoute";

function subRoute(element: React.ReactElement): React.ReactElement {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute role="sub">{element}</RoleProtectedRoute>
    </ProtectedRoute>
  );
}

export const SUB_ROUTES: RouteObject[] = [
  {
    path: "/porch",
    element: (
      <ProtectedRoute noLayout>
        <PorchRoute />
      </ProtectedRoute>
    ),
  },
  { path: "/pending-entry-tribute", element: <Navigate to="/porch" replace /> },
  { path: "/sub/payments", element: subRoute(<PaymentHistoryRoute />) },
  { path: "/sub/payments/new", element: subRoute(<PaymentFormRoute />) },
  { path: "/sub/debts", element: subRoute(<SubContractsRoute />) },
  { path: "/sub/debts/new", element: subRoute(<ProposeContractRoute />) },
  { path: "/sub/debts/:slug/sign", element: subRoute(<ContractSignRoute />) },
  { path: "/sub/adjustments", element: subRoute(<PendingAdjustmentsRoute />) },
  { path: "/sub/dashboard", element: subRoute(<SubDashboardRoute />) },
  { path: "/sub/profile/kinks", element: subRoute(<KinksRoute />) },
  { path: "/profile/kinks", element: <Navigate to="/sub/profile/kinks" replace /> },
  { path: "/sub/profile/limits", element: subRoute(<LimitsRoute />) },
  { path: "/profile/limits", element: <Navigate to="/sub/profile/limits" replace /> },
  { path: "/sub/today", element: subRoute(<TodayRoute />) },
  { path: "/today", element: <Navigate to="/sub/today" replace /> },
  { path: "/sub/journal", element: subRoute(<JournalRoute />) },
  { path: "/sub/profile/inventory", element: subRoute(<SubInventoryRoute />) },
  { path: "/sub/profile/aftercare", element: subRoute(<AftercareRoute />) },
  { path: "/profile/aftercare", element: <Navigate to="/sub/profile/aftercare" replace /> },
  { path: "/sub/profile/medical", element: subRoute(<MedicalRoute />) },
  { path: "/profile/medical", element: <Navigate to="/sub/profile/medical" replace /> },
];
