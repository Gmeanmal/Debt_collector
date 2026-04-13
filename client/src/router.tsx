import { createBrowserRouter } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { ForgotPasswordRoute } from "./routes/ForgotPasswordRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { InviteSubRoute } from "./routes/goddess/InviteSubRoute";
import { InvitationsListRoute } from "./routes/goddess/InvitationsListRoute";
import { PaymentMethodsRoute } from "./routes/goddess/PaymentMethodsRoute";
import { InviteLandingRoute } from "./routes/public/InviteLandingRoute";
import { SignupRoute } from "./routes/public/SignupRoute";
import { PendingEntryTributeRoute } from "./routes/sub/PendingEntryTributeRoute";

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
  { path: "/health", element: <HealthRoute /> },
]);
