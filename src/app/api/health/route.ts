import { route } from "@/server/http";
import { sql } from "@/server/db/sql";
import { providerStatus } from "@/server/providers/registry";

// Uptime check for monitoring (NFR-09): whether the database answers, and which provider each outside service uses
// with the names of any keys still missing (never their values; docs/PROVIDERS.md).
export const GET = route({ auth: "public" }, async () => {
  const started = Date.now();
  let ok = true;
  try {
    await sql()`select 1`;
  } catch {
    ok = false;
  }
  const providers = providerStatus().map((p) => ({ service: p.service, uses: p.providers.join(","), missingKeys: p.missingKeys }));
  const body = { ok, database: ok ? "ok" : "unreachable", latencyMs: Date.now() - started, providers };
  return Response.json(body, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
});
