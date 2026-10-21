import "server-only";
import { z } from "zod";
import { defineJob } from "@/server/jobs/registry";
import { expireTransaction, overdueTransaction, remindTransaction } from "./public";

// Business Security jobs (PRD v3.0 section 18): reminders on day 2 and day 5 while the link is unopened, expiry at the
// end of the link validity, and the overdue check at 00:30 IST the day after the due date.
defineJob({
  kind: "transaction.remind",
  parse: (p) => z.object({ id: z.uuid(), day: z.number().int(), version: z.number().int() }).parse(p),
  run: async ({ id, day, version }) => void (await remindTransaction(id, day, version)),
});

defineJob({
  kind: "transaction.expire",
  parse: (p) => z.object({ id: z.uuid(), version: z.number().int() }).parse(p),
  run: async ({ id, version }) => void (await expireTransaction(id, version)),
});

defineJob({
  kind: "transaction.overdue",
  parse: (p) => z.object({ id: z.uuid() }).parse(p),
  run: async ({ id }) => void (await overdueTransaction(id)),
});
