"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/server/db/types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Supabase client for client components (sign-in, live report updates). Uses the publishable key only. */
export function browserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
