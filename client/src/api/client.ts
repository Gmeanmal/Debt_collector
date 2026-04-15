import createClient from "openapi-fetch";
import type { paths } from "../types/api.generated";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4011",
  credentials: "include",
});
