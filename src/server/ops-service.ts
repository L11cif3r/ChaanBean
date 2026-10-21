import "server-only";
import { audit } from "@/server/audit";
import { mcaImports, startMcaImport } from "@/server/companies/mca-import";
import { sql } from "@/server/db/sql";
import { notFound } from "@/server/errors";
import { mcaKey } from "@/server/providers/mca";
import { providerStatus } from "@/server/providers/registry";
import type { RequestContext } from "@/server/context";

// Ops console data (S21, v4 FR-MK-01 and 14.3): which source serves each check, the MCA copy, and per-organisation
// sample data mode and KYC.

export async function opsOverview() {
  const db = sql();
  const [orgs, [mca], [size], imports] = await Promise.all([
    db<{ id: string; legal_name: string; created_at: Date; sample_data_mode: boolean; kyc_status: string; wallet: string | null; members: number }[]>`
      select o.id, o.legal_name, o.created_at, o.sample_data_mode, o.kyc_status,
             (select balance_paise from public.wallets w where w.org_id = o.id) as wallet,
             (select count(*)::int from public.memberships m where m.org_id = o.id and m.status = 'active') as members
        from public.organisations o order by o.created_at desc limit 200`,
    db<{ companies: number; states: string[] | null }[]>`
      select count(*)::int as companies, (select array_agg(distinct scope order by scope) from app_private.mca_imports where status = 'done') as states
        from public.mca_companies`,
    db<{ bytes: string }[]>`select pg_database_size(current_database())::text as bytes`,
    mcaImports(),
  ]);
  return {
    providers: providerStatus().map((p) => ({ service: p.service, providers: p.providers, missingKeys: p.missingKeys })),
    sampleEnv: process.env.SAMPLE_DATA_MODE === "true",
    mca: { companies: mca.companies, states: (mca.states ?? []).map((s) => s.replace(/^state=/, "")), keySet: Boolean(mcaKey()), imports },
    databaseBytes: Number(size.bytes),
    orgs: orgs.map((o) => ({
      id: o.id, name: o.legal_name, createdAt: o.created_at.toISOString(), sample: o.sample_data_mode, kyc: o.kyc_status,
      walletPaise: Number(o.wallet ?? 0), members: o.members,
    })),
  };
}

export async function setSampleMode(ctx: RequestContext, orgId: string, on: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) throw notFound("This organisation");
  const [o] = await sql()<{ id: string }[]>`update public.organisations set sample_data_mode = ${on} where id = ${orgId} returning id`;
  if (!o) throw notFound("This organisation");
  await audit(ctx, { orgId, action: on ? "ops.sample_mode_on" : "ops.sample_mode_off", entity: "organisation", entityId: orgId });
  return { sample: on };
}

export async function opsStartMcaImport(ctx: RequestContext, state: string) {
  const importId = await startMcaImport(state);
  await audit(ctx, { orgId: null, action: "ops.mca_import", entity: "mca_import", entityId: String(importId), after: { state } });
  return { importId };
}
