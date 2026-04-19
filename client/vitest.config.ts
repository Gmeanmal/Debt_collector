import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    env: {
      VITE_API_BASE_URL: "http://localhost:4011",
      VITE_WS_BASE_URL: "ws://localhost:4011",
      VITE_MEDICAL_FEATURE_ENABLED: "false",
      VITE_VAPID_PUBLIC_KEY: "",
    },
  },
});
