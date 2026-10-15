import "server-only";
import { z } from "zod";
import { audit, systemActor } from "@/server/audit";
import { adminClient } from "@/server/supabase/admin";
import { defineJob } from "./registry";

// Every job kind is registered here so the runner knows it. Later parts add their own files and import them below.

/**
 * Re-checks an organisation's audit hash chain. A broken chain means someone changed the log outside the
 * application, so it is reported loudly and recorded as a platform event.
 */
defineJob({
  kind: "audit.verify_chain",
  parse: (p) => z.object({ orgId: z.uuid() }).parse(p),
  async run({ orgId }, job) {
    const { data, error } = await adminClient().rpc("verify_audit_chain", { p_org: orgId });
    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (result && result.broken_seq !== null) {
      console.error(`[audit] chain broken for org ${orgId} at seq ${result.broken_seq}`);
      await audit(systemActor(`job:${job.id}`), {
        orgId: null,
        action: "audit.chain_broken",
        entity: "organisation",
        entityId: orgId,
        after: { brokenSeq: result.broken_seq, checked: result.checked },
      });
    }
  },
});
