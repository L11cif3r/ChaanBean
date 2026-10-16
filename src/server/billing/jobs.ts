import "server-only";
import { z } from "zod";
import { sql } from "@/server/db/sql";
import { defineJob } from "@/server/jobs/registry";

/**
 * Reverses a hold whose action never finished by its expiry (FR-BIL-05). Holds that were committed or reversed in
 * the meantime are left alone. Also sweeps any other expired holds, in case a job was lost.
 */
defineJob({
  kind: "billing.release_hold",
  parse: (p) => z.object({ orgId: z.uuid(), holdId: z.string().regex(/^\d+$/) }).parse(p),
  async run({ orgId, holdId }, job) {
    const db = sql();
    const [open] = await db`
      select 1 from public.usage_ledger h
       where h.id = ${holdId}::bigint and h.org_id = ${orgId} and h.type = 'hold'
         and not exists (select 1 from public.usage_ledger c where c.hold_id = h.id)`;
    if (open) await db`select app_private.close_hold(${orgId}::uuid, ${holdId}::bigint, false, 'Hold expired', 'system', ${`job:${job.id}`})`;
    await db`select app_private.release_expired_holds(50)`;
  },
});
