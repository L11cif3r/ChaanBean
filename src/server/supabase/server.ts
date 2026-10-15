import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/server/db/types";

/**
 * Supabase client acting as the signed-in user, from the request cookies. Row-level security applies, so every query
 * only sees that user's organisations. Create one per request.
 */
export async function userClient() {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) store.set(name, value, options);
          } catch {
            // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
          }
        },
      },
    },
  );
}
