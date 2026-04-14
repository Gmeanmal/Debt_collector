import { createBrowserRouter } from "react-router-dom";
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
import { RollingEditorRoute } from "./routes/goddess/RollingEditorRoute";
import { ContractFormRoute } from "./routes/goddess/ContractFormRoute";
import { GoddessContractsRoute } from "./routes/goddess/GoddessContractsRoute";
import { InviteLandingRoute } from "./routes/public/InviteLandingRoute";
import { SignupRoute } from "./routes/public/SignupRoute";
import { PendingEntryTributeRoute } from "./routes/sub/PendingEntryTributeRoute";
import { PaymentFormRoute } from "./routes/sub/PaymentFormRoute";
import { PaymentHistoryRoute } from "./routes/sub/PaymentHistoryRoute";
import { SubContractsRoute } from "./routes/sub/SubContractsRoute";
import { ProposeContractRoute } from "./routes/sub/ProposeContractRoute";
import { ContractDetailRoute } from "./routes/ContractDetailRoute";

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
    path: "/pending-entry-tribute",
    element: (
      <ProtectedRoute>
        <PendingEntryTributeRoute />
      </ProtectedRoute>
    ),
  },
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
    path: "/goddess/subs/:subId/rolling",
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute role="goddess">
          <RollingEditorRoute />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/goddess/subs/:subId/debts/new",
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
    path: "/debts/:contractId",
    element: (
      <ProtectedRoute>
        <ContractDetailRoute />
      </ProtectedRoute>
    ),
  },
  { path: "/health", element: <HealthRoute /> },
]);
