import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_WS_BASE_URL: z.string().url(),
  VITE_MEDICAL_FEATURE_ENABLED: z.enum(["true", "false"]).default("false"),
  VITE_VAPID_PUBLIC_KEY: z.string().default(""),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  throw new Error(`[env] Invalid environment variables — ${missing}`);
}

export const env = parsed.data;
