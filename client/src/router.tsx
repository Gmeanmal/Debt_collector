import { createBrowserRouter, Navigate } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { ForgotPasswordRoute } from "./routes/ForgotPasswordRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleProtectedRoute } from "./routes/RoleProtectedRoute";
import { InviteSubRoute } from "./routes/goddess/InviteSubRoute";
import { InvitationsListRoute } from "./routes/goddess/InvitationsListRoute";
import { PaymentMethodsRoute } from "./routes/goddess/PaymentMethodsRoute";
import { PendingValidationsRoute } from "./routes/goddess/PendingValidationsRoute";
import { RecordPaymentRoute } from "./routes/goddess/RecordPaymentRoute";
import { ContractFormRoute } from "./routes/goddess/ContractFormRoute";
import { GoddessContractsRoute } from "./routes/goddess/GoddessContractsRoute";
import { SubsListRoute } from "./routes/goddess/SubsListRoute";
import { SubManageRoute } from "./routes/goddess/subs/SubManageRoute";
import { InviteLandingRoute } from "./routes/public/InviteLandingRoute";
import { SignupRoute } from "./routes/public/SignupRoute";
import { PorchRoute } from "./routes/sub/PorchRoute";
import { PaymentFormRoute } from "./routes/sub/PaymentFormRoute";
import { PaymentHistoryRoute } from "./routes/sub/PaymentHistoryRoute";
import { SubContractsRoute } from "./routes/sub/SubContractsRoute";
import { ProposeContractRoute } from "./routes/sub/ProposeContractRoute";
import { ContractSignRoute } from "./routes/sub/ContractSignRoute";
import { ContractDetailRoute } from "./routes/ContractDetailRoute";
import { PendingAdjustmentsRoute } from "./routes/sub/PendingAdjustmentsRoute";
import { BlacklistRoute } from "./routes/goddess/BlacklistRoute";
import { BreachSubRoute } from "./routes/goddess/BreachSubRoute";
import { AdminCronRoute } from "./routes/admin/AdminCronRoute";
import { AdminRoute } from "./routes/admin/AdminRoute";
import { DashboardRoute as GoddessDashboardRoute } from "./routes/goddess/DashboardRoute";
import { WeeklyPaymentsRoute } from "./routes/goddess/WeeklyPaymentsRoute";
import { LateRoute } from "./routes/goddess/LateRoute";
import { SubDashboardRoute } from "./routes/sub/DashboardRoute";
import { NotFoundRoute, RouterErrorBoundary } from "./routes/NotFoundRoute";
import { ProfileRoute } from "./routes/ProfileRoute";
import { ProfileChangeRequestsRoute } from "./routes/goddess/ProfileChangeRequestsRoute";
import { ContractPreviewRoute } from "./routes/goddess/ContractPreviewRoute";
import { PhotoQueueRoute } from "./routes/goddess/PhotoQueueRoute";
import { KinksRoute } from "./routes/profile/KinksRoute";
import { LimitsRoute } from "./routes/profile/LimitsRoute";
import { TodayRoute } from "./routes/sub/TodayRoute";
import { JournalRoute } from "./routes/sub/JournalRoute";
import { InventoryRoute as SubInventoryRoute } from "./routes/sub/InventoryRoute";
import { JournalReaderRoute } from "./routes/goddess/JournalReaderRoute";
import { MeritsAdminRoute } from "./routes/goddess/MeritsAdminRoute";
import { GoddessInventoryRoute } from "./routes/goddess/InventoryRoute";
import { PenaltyRulesRoute } from "./routes/goddess/PenaltyRulesRoute";
import { KinkOverviewRoute } from "./routes/goddess/KinkOverviewRoute";
import { ReviewQueueRoute } from "./routes/goddess/ReviewQueueRoute";
import { AftercareRoute } from "./routes/profile/AftercareRoute";
import { MedicalRoute } from "./routes/profile/MedicalRoute";
import { GoddessRitualsRoute } from "./routes/goddess/GoddessRitualsRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginRoute /> },
  { path: "/forgot-password", element: <ForgotPasswordRoute /> },
  { path: "/reset-password", element: <ResetPasswordRoute /> },
  { path: "/invite/:token", element: <InviteLandingRoute /> },
  { path: "/invite/:token/signup", element: <SignupRoute /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomeRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/invite",
    element: (
      <ProtectedRoute>
        <InviteSubRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/invitations",
    element: (
      <ProtectedRoute>
        <InvitationsListRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/payment-methods",
    element: (
      <ProtectedRoute>
        <PaymentMethodsRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/porch",
    element: (
      <ProtectedRoute noLayout>
        <PorchRoute />
      </ProtectedRoute>
    ),
  },
  // Legacy redirect — keep in case old emails/bookmarks reference the old path
  { path: "/pending-entry-tribute", element: <Navigate to="/porch" replace /> },
  {
    path: "/sub/payments",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <PaymentHistoryRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/payments/new",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <PaymentFormRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/validations",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <PendingValidationsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/payments/record",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <RecordPaymentRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:username/rolling",
    element: <Navigate to=".." replace relative="path" />,
  },
  {
    path: "/goddess/subs/:username/debts/new",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <ContractFormRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/debts",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <GoddessContractsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/debts",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <SubContractsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/debts/new",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <ProposeContractRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/debts/:slug/sign",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <ContractSignRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/debts/:slug",
    element: (
      <ProtectedRoute>
        <ContractDetailRoute />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/adjustments",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <PendingAdjustmentsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/blacklist",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <BlacklistRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:username/breach",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <BreachSubRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="admin">
          <AdminRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/cron",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="admin">
          <AdminCronRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/dashboard",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <GoddessDashboardRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/dashboard",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <SubDashboardRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <SubsListRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:username",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <SubManageRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/payments/weekly",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <WeeklyPaymentsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  // Legacy redirect — preserve old bookmarks/emails pointing at /goddess/weekly
  { path: "/goddess/weekly", element: <Navigate to="/goddess/payments/weekly" replace /> },
  {
    path: "/goddess/late",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <LateRoute />
        </RoleProtectedRoute>
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
  {
    path: "/goddess/profile-change-requests",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <ProfileChangeRequestsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/contracts/:slug/preview",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <ContractPreviewRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/photo-queue",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <PhotoQueueRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/profile/kinks",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <KinksRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/profile/kinks", element: <Navigate to="/sub/profile/kinks" replace /> },
  {
    path: "/sub/profile/limits",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <LimitsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/profile/limits", element: <Navigate to="/sub/profile/limits" replace /> },
  {
    path: "/sub/today",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <TodayRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/today", element: <Navigate to="/sub/today" replace /> },
  {
    path: "/sub/journal",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <JournalRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/profile/inventory",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <SubInventoryRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:username/journal",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <JournalReaderRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/merits",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <MeritsAdminRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:username/inventory",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <GoddessInventoryRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/penalty-rules",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <PenaltyRulesRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/kinks",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <KinkOverviewRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/review-queue",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <ReviewQueueRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/sub/profile/aftercare",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <AftercareRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/profile/aftercare", element: <Navigate to="/sub/profile/aftercare" replace /> },
  {
    path: "/sub/profile/medical",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="sub">
          <MedicalRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/profile/medical", element: <Navigate to="/sub/profile/medical" replace /> },
  {
    path: "/goddess/rituals",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <GoddessRitualsRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  { path: "/health", element: <HealthRoute /> },
  { path: "*", element: <NotFoundRoute />, errorElement: <RouterErrorBoundary /> },
]);
