import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_WS_BASE_URL: z.string().url(),
  // Controls YouPay iframe embedding. Default "false" (deep-link only).
  // Set to "true" only if YouPay's T&C/X-Frame-Options permit embedding.
  VITE_YOUPAY_IFRAME_ALLOWED: z.enum(["true", "false"]).default("false"),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  throw new Error(`[env] Invalid environment variables — ${missing}`);
}

export const env = parsed.data;
