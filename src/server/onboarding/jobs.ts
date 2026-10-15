import "server-only";
import { z } from "zod";
import { audit, systemActor } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { defineJob } from "@/server/jobs/registry";
import { identityProvider } from "@/server/providers/identity";

/**
 * Retries GSTIN verification for an organisation created while the GST provider was down (S02 "retry in the
 * background"). Throwing makes the job runner retry with backoff, up to the job's max attempts.
 */
defineJob({
  kind: "onboarding.verify_gstin",
  parse: (p) => z.object({ orgId: z.uuid(), gstin: z.string().length(15) }).parse(p),
  timeoutMs: 45_000,
  async run({ orgId, gstin }, job) {
    const [org] = await sql()<{ verification_status: string }[]>`select verification_status::text from public.organisations where id = ${orgId}`;
    if (!org || org.verification_status !== "unverified") return;

    const result = await identityProvider().searchGstin(gstin);
    if (result.status === "not_available" || result.status === "failed") throw new Error("GST provider still unavailable");

    const actor = systemActor(`job:${job.id}`, orgId);
    if (result.status === "success" && result.data?.status === "Active") {
      const d = result.data;
      await sql()`
        update public.organisations
           set legal_name = ${d.legalName}, trade_name = ${d.tradeName}, constitution = ${d.constitution},
               address = ${sql().json(d.address)}::jsonb, verification_status = 'gstin_verified', status = 'active'
         where id = ${orgId}`;
      await audit(actor, { action: "organisation.verified", entity: "organisation", entityId: orgId, after: { method: "gstin" } });
      return;
    }
    const reason = result.status === "no_data" ? "gstin_not_found" : `gstin_${result.data!.status.toLowerCase()}`;
    await sql()`update public.organisations set verification_status = 'manual_review' where id = ${orgId}`;
    await sql()`insert into public.manual_reviews (org_id, reason) values (${orgId}, ${reason})`;
    await audit(actor, { action: "organisation.manual_review_requested", entity: "organisation", entityId: orgId, after: { reason } });
  },
});
