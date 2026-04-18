import { createBrowserRouter } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { ForgotPasswordRoute } from "./routes/ForgotPasswordRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { InviteLandingRoute } from "./routes/public/InviteLandingRoute";
import { SignupRoute } from "./routes/public/SignupRoute";
import { NotFoundRoute, RouterErrorBoundary } from "./routes/NotFoundRoute";
import { GODDESS_ROUTES } from "./routes/_goddessRoutes";
import { SUB_ROUTES } from "./routes/_subRoutes";
import { ADMIN_ROUTES } from "./routes/_adminRoutes";
import { SHARED_ROUTES } from "./routes/_sharedRoutes";

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
  ...GODDESS_ROUTES,
  ...SUB_ROUTES,
  ...ADMIN_ROUTES,
  ...SHARED_ROUTES,
  { path: "/health", element: <HealthRoute /> },
  { path: "*", element: <NotFoundRoute />, errorElement: <RouterErrorBoundary /> },
]);
