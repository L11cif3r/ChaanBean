import "server-only";
import postgres from "postgres";
import { serverEnv } from "@/server/env";

// Direct database connection for system work: background jobs, audit writes, stored files and writes the route has
// already authorised. It logs in with the database password in DATABASE_URL and bypasses row-level security, so it
// must never read data on a user's behalf; use the user client (src/server/supabase/server.ts) for that.
//
// It connects through Supabase's session pooler (DIRECT_URL, port 5432) when that is set, and falls back to
// DATABASE_URL. Decided 16 Oct: on the transaction pooler (port 6543) bursts of parallel postgres.js queries leave a
// backend waiting for a Bind that never arrives, so pages hang until the statement timeout (reproduced in plain Node;
// the session pooler runs the same queries in ~0.4 s). Revisit for the Mumbai production project.

export type Sql = postgres.Sql;

/** Removes Prisma-only query parameters (pgbouncer, connection_limit …) that Postgres itself would reject. */
export function connectionUrl(raw: string): string {
  const url = new URL(raw);
  for (const p of ["pgbouncer", "connection_limit", "pool_timeout", "schema"]) url.searchParams.delete(p);
  return url.toString();
}

const g = globalThis as unknown as { __cbSql?: Sql };

export function sql(): Sql {
  // Kept on globalThis so hot reloads in development reuse the pool instead of opening new connections.
  const env = serverEnv();
  g.__cbSql ??= postgres(connectionUrl(env.DIRECT_URL ?? env.DATABASE_URL), {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: "require",
    onnotice: () => undefined,
  });
  return g.__cbSql;
}

/** Closes the pool (tests and scripts). */
export async function closeSql() {
  await g.__cbSql?.end({ timeout: 5 });
  g.__cbSql = undefined;
}
