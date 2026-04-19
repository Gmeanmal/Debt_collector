import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { router } from "./router";
import "./styles/globals.css";
// Register auth middleware (Bearer injection + 401 refresh)
import "./services/auth/authClient";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  registerSW({ immediate: true });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as { type?: string; url?: string } | null;
    if (data && data.type === "navigate" && typeof data.url === "string") {
      router.navigate(data.url).catch(() => {
        window.location.href = data.url ?? "/";
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
