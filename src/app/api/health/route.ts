import { route } from "@/server/http";
import { adminClient } from "@/server/supabase/admin";

// Uptime check for monitoring (NFR-09). Reports only whether the database answers; no data.
export const GET = route({ auth: "public" }, async () => {
  const started = Date.now();
  const { error } = await adminClient().from("jobs").select("id", { head: true, count: "exact" }).limit(1);
  const body = { ok: !error, database: error ? "unreachable" : "ok", latencyMs: Date.now() - started };
  return Response.json(body, { status: error ? 503 : 200, headers: { "cache-control": "no-store" } });
});
