import { createBrowserRouter } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { ForgotPasswordRoute } from "./routes/ForgotPasswordRoute";
import { ResetPasswordRoute } from "./routes/ResetPasswordRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginRoute /> },
  { path: "/forgot-password", element: <ForgotPasswordRoute /> },
  { path: "/reset-password", element: <ResetPasswordRoute /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomeRoute />
      </ProtectedRoute>
    ),
  },
  { path: "/health", element: <HealthRoute /> },
]);
