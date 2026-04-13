import { createBrowserRouter } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";

export const router = createBrowserRouter([{ path: "/", element: <HealthRoute /> }]);
