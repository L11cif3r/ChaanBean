import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";
import { serverEnv } from "@/server/env";

export type AdminClient = SupabaseClient<Database>;

let client: AdminClient | null = null;

/**
 * Supabase client with the secret key. It bypasses row-level security, so it is only for system work: background
 * jobs, audit writes and writes that the route has already authorised. Never pass its results to a user unchecked.
 */
export function adminClient(): AdminClient {
  if (client) return client;
  const env = serverEnv();
  client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
