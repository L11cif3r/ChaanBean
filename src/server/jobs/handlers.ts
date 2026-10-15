import "server-only";
import { z } from "zod";
import { audit, systemActor } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { defineJob } from "./registry";

// Every job kind is registered here so the runner knows it. Later parts add their own files and import them below.
import "@/server/onboarding/jobs";

/**
 * Re-checks an organisation's audit hash chain. A broken chain means someone changed the log outside the
 * application, so it is reported loudly and recorded as a platform event.
 */
defineJob({
  kind: "audit.verify_chain",
  parse: (p) => z.object({ orgId: z.uuid() }).parse(p),
  async run({ orgId }, job) {
    const [result] = await sql()<{ broken_seq: string | null; checked: string }[]>`
      select broken_seq, checked from public.verify_audit_chain(${orgId}::uuid)`;
    if (result && result.broken_seq !== null) {
      console.error(`[audit] chain broken for org ${orgId} at seq ${result.broken_seq}`);
      await audit(systemActor(`job:${job.id}`), {
        orgId: null,
        action: "audit.chain_broken",
        entity: "organisation",
        entityId: orgId,
        after: { brokenSeq: Number(result.broken_seq), checked: Number(result.checked) },
      });
    }
  },
});
