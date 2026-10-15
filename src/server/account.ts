import "server-only";
import { cache } from "react";
import { sql } from "@/server/db/sql";
import { getContext } from "@/server/context";

// What the signed-in shell needs about the user and their organisations, loaded once per request.
export const loadAccount = cache(async () => {
  const ctx = await getContext();
  if (!ctx.user) return { ctx, profile: null, orgs: [] as { id: string; name: string; role: string; verification: string; status: string }[] };
  const ids = ctx.memberships.map((m) => m.orgId);
  const [profiles, orgs] = await Promise.all([
    sql()<{ full_name: string | null }[]>`select full_name from public.user_profiles where id = ${ctx.user.id}`,
    ids.length
      ? sql()<{ id: string; legal_name: string; trade_name: string | null; verification_status: string; status: string }[]>`
          select id, legal_name, trade_name, verification_status::text, status::text from public.organisations where id in ${sql()(ids)}`
      : Promise.resolve([]),
  ]);
  const byId = new Map(orgs.map((o) => [o.id, o]));
  return {
    ctx,
    profile: { fullName: profiles[0]?.full_name ?? "" },
    orgs: ctx.memberships
      .map((m) => {
        const o = byId.get(m.orgId);
        return o ? { id: o.id, name: o.trade_name || o.legal_name, role: m.role, verification: o.verification_status, status: o.status } : null;
      })
      .filter((o): o is NonNullable<typeof o> => o !== null),
  };
});
