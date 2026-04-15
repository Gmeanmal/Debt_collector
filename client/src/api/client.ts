import createClient from "openapi-fetch";
import type { paths } from "../types/api.generated";
import { env } from "../utils/env";

export const apiClient = createClient<paths>({
  baseUrl: env.VITE_API_BASE_URL,
  credentials: "include",
});
