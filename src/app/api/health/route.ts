import { route } from "@/server/http";
import { sql } from "@/server/db/sql";

// Uptime check for monitoring (NFR-09). Reports only whether the database answers; no data.
export const GET = route({ auth: "public" }, async () => {
  const started = Date.now();
  let ok = true;
  try {
    await sql()`select 1`;
  } catch {
    ok = false;
  }
  const body = { ok, database: ok ? "ok" : "unreachable", latencyMs: Date.now() - started };
  return Response.json(body, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
});
