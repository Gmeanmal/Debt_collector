import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleProtectedRoute } from "./RoleProtectedRoute";
import { InviteSubRoute } from "./goddess/InviteSubRoute";
import { InvitationsListRoute } from "./goddess/InvitationsListRoute";
import { PaymentMethodsRoute } from "./goddess/PaymentMethodsRoute";
import { PendingValidationsRoute } from "./goddess/PendingValidationsRoute";
import { RecordPaymentRoute } from "./goddess/RecordPaymentRoute";
import { ContractFormRoute } from "./goddess/ContractFormRoute";
import { GoddessContractsRoute } from "./goddess/GoddessContractsRoute";
import { SubsListRoute } from "./goddess/SubsListRoute";
import { SubManageRoute } from "./goddess/subs/SubManageRoute";
import { BlacklistRoute } from "./goddess/BlacklistRoute";
import { BreachSubRoute } from "./goddess/BreachSubRoute";
import { DashboardRoute as GoddessDashboardRoute } from "./goddess/DashboardRoute";
import { WeeklyPaymentsRoute } from "./goddess/WeeklyPaymentsRoute";
import { LateRoute } from "./goddess/LateRoute";
import { ProfileChangeRequestsRoute } from "./goddess/ProfileChangeRequestsRoute";
import { ContractPreviewRoute } from "./goddess/ContractPreviewRoute";
import { PhotoQueueRoute } from "./goddess/PhotoQueueRoute";
import { JournalReaderRoute } from "./goddess/JournalReaderRoute";
import { MeritsAdminRoute } from "./goddess/MeritsAdminRoute";
import { GoddessInventoryRoute } from "./goddess/InventoryRoute";
import { PenaltyRulesRoute } from "./goddess/PenaltyRulesRoute";
import { KinkOverviewRoute } from "./goddess/KinkOverviewRoute";
import { ReviewQueueRoute } from "./goddess/ReviewQueueRoute";
import { GoddessRitualsRoute } from "./goddess/GoddessRitualsRoute";

function goddessRoute(element: React.ReactElement): React.ReactElement {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute role="goddess">{element}</RoleProtectedRoute>
    </ProtectedRoute>
  );
}

export const GODDESS_ROUTES: RouteObject[] = [
  { path: "/goddess/invite", element: goddessRoute(<InviteSubRoute />) },
  { path: "/goddess/invitations", element: goddessRoute(<InvitationsListRoute />) },
  { path: "/goddess/payment-methods", element: goddessRoute(<PaymentMethodsRoute />) },
  { path: "/goddess/validations", element: goddessRoute(<PendingValidationsRoute />) },
  { path: "/goddess/payments/record", element: goddessRoute(<RecordPaymentRoute />) },
  {
    path: "/goddess/subs/:username/rolling",
    element: <Navigate to=".." replace relative="path" />,
  },
  { path: "/goddess/subs/:username/debts/new", element: goddessRoute(<ContractFormRoute />) },
  { path: "/goddess/debts", element: goddessRoute(<GoddessContractsRoute />) },
  { path: "/goddess/blacklist", element: goddessRoute(<BlacklistRoute />) },
  { path: "/goddess/subs/:username/breach", element: goddessRoute(<BreachSubRoute />) },
  { path: "/goddess/dashboard", element: goddessRoute(<GoddessDashboardRoute />) },
  { path: "/goddess/subs", element: goddessRoute(<SubsListRoute />) },
  { path: "/goddess/subs/:username", element: goddessRoute(<SubManageRoute />) },
  { path: "/goddess/payments/weekly", element: goddessRoute(<WeeklyPaymentsRoute />) },
  { path: "/goddess/weekly", element: <Navigate to="/goddess/payments/weekly" replace /> },
  { path: "/goddess/late", element: goddessRoute(<LateRoute />) },
  {
    path: "/goddess/profile-change-requests",
    element: goddessRoute(<ProfileChangeRequestsRoute />),
  },
  {
    path: "/goddess/contracts/:slug/preview",
    element: goddessRoute(<ContractPreviewRoute />),
  },
  { path: "/goddess/photo-queue", element: goddessRoute(<PhotoQueueRoute />) },
  {
    path: "/goddess/subs/:username/journal",
    element: goddessRoute(<JournalReaderRoute />),
  },
  { path: "/goddess/merits", element: goddessRoute(<MeritsAdminRoute />) },
  {
    path: "/goddess/subs/:username/inventory",
    element: goddessRoute(<GoddessInventoryRoute />),
  },
  { path: "/goddess/penalty-rules", element: goddessRoute(<PenaltyRulesRoute />) },
  { path: "/goddess/kinks", element: goddessRoute(<KinkOverviewRoute />) },
  { path: "/goddess/review-queue", element: goddessRoute(<ReviewQueueRoute />) },
  { path: "/goddess/rituals", element: goddessRoute(<GoddessRitualsRoute />) },
];
