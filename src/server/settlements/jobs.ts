import "server-only";
import { z } from "zod";
import { defineJob } from "@/server/jobs/registry";
import { expireSettlement, instalmentCheck, instalmentDue, remindSettlement } from "./public";

// E-Settlement jobs (PRD v3.0 8.7, FR-ES-05): reminders on day 2 and day 5 while the link is unopened, expiry at the
// end of the link validity, a note to the creditor on each instalment date, and the missed check after the grace days.
defineJob({
  kind: "settlement.remind",
  parse: (p) => z.object({ id: z.uuid(), day: z.number().int(), version: z.number().int() }).parse(p),
  run: async ({ id, day, version }) => void (await remindSettlement(id, day, version)),
});

defineJob({
  kind: "settlement.expire",
  parse: (p) => z.object({ id: z.uuid(), version: z.number().int() }).parse(p),
  run: async ({ id, version }) => void (await expireSettlement(id, version)),
});

defineJob({
  kind: "settlement.instalment_due",
  parse: (p) => z.object({ id: z.uuid(), seq: z.number().int() }).parse(p),
  run: async ({ id, seq }) => void (await instalmentDue(id, seq)),
});

defineJob({
  kind: "settlement.instalment_check",
  parse: (p) => z.object({ id: z.uuid() }).parse(p),
  run: async ({ id }) => void (await instalmentCheck(id)),
});
