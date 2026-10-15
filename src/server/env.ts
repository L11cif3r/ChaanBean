import "server-only";
import { z } from "zod";

// Server environment, validated once on first use. Secrets are never logged or sent to the browser.

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20, "SUPABASE_SECRET_KEY is missing. Paste it into .env.local."),
  FIELD_ENCRYPTION_KEY: z.string().min(40),
  BLIND_INDEX_KEY: z.string().min(40),
  CRON_SECRET: z.string().min(32),
  APP_LOCAL_JOBS: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Server configuration is incomplete: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
