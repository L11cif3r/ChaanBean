import "server-only";
import { maskEmail } from "@/lib/mask";
import { formatInr } from "@/lib/money";
import { sql } from "@/server/db/sql";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { mapBillingError } from "./service";

// Charging a paid action (PRD 5.9, FR-BIL-04/05), for the parts that sell checks, transactions and settlements:
//   const hold = await placeHold({ ... });           // when the action starts: wallet at price + GST
//   ... run the action ...
//   await commitHold(orgId, hold.id)                  // it succeeded (also when it ran correctly and found nothing)
//   await reverseHold(orgId, hold.id, "reason")       // it failed: the unit or money comes back at once
// A hold left open past its expiry is reversed by the billing.release_hold job.

export interface HoldInput {
  orgId: string;
  itemCode: string;
  /** What is being charged for, e.g. ("check_request", id). */
  refType: string;
  refId: string;
  /** Same key → same hold, so a retried request never charges twice. */
  idempotencyKey?: string;
  /** Reverse automatically if still open after this long. Default 15 minutes; consent waits pass their expiry. */
  expiresAt?: Date;
  actorId: string;
  requestId: string;
}

export interface Hold {
  id: string;
  source: "plan" | "wallet";
  amountPaise: bigint;
  balanceAfterPaise: bigint | null;
}

export async function placeHold(input: HoldInput): Promise<Hold> {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 15 * 60_000);
  let row: { id: string; source: Hold["source"]; amount_paise: string; balance_after_paise: string | null };
  try {
    [row] = await sql()<typeof row[]>`
      select id, source::text as source, amount_paise, balance_after_paise
        from app_private.place_hold(${input.orgId}::uuid, ${input.itemCode}, ${input.refType}, ${input.refId},
          ${input.idempotencyKey ?? null}, ${expiresAt}::timestamptz, ${input.actorId}, ${input.requestId})`;
  } catch (e) {
    mapBillingError(e);
  }
  const hold: Hold = {
    id: String(row.id),
    source: row.source,
    amountPaise: BigInt(row.amount_paise),
    balanceAfterPaise: row.balance_after_paise === null ? null : BigInt(row.balance_after_paise),
  };
  await enqueue("billing.release_hold", { orgId: input.orgId, holdId: hold.id }, {
    runAt: expiresAt, dedupeKey: `billing.release_hold:${hold.id}`, orgId: input.orgId, kick: false,
  });
  if (hold.source === "wallet") await alertIfLow(input.orgId, -hold.amountPaise, hold.balanceAfterPaise);
  return hold;
}

async function closeHold(orgId: string, holdId: string, commit: boolean, note: string | null, actorId: string, requestId: string) {
  try {
    await sql()`select app_private.close_hold(${orgId}::uuid, ${holdId}::bigint, ${commit}, ${note}, ${actorId}, ${requestId})`;
  } catch (e) {
    mapBillingError(e);
  }
}

export const commitHold = (orgId: string, holdId: string, actorId = "system", requestId = "commit") =>
  closeHold(orgId, holdId, true, null, actorId, requestId);

export const reverseHold = (orgId: string, holdId: string, reason: string, actorId = "system", requestId = "reverse") =>
  closeHold(orgId, holdId, false, reason, actorId, requestId);

/** S19 low-balance alert: one message when a charge takes the wallet below the amount the organisation set. */
async function alertIfLow(orgId: string, chargedPaise: bigint, balanceAfter: bigint | null) {
  if (balanceAfter === null) return;
  const [w] = await sql()<{ alert_paise: string | null; legal_name: string }[]>`
    select w.alert_paise, o.legal_name from public.wallets w join public.organisations o on o.id = w.org_id where w.org_id = ${orgId}`;
  if (!w?.alert_paise) return;
  const alert = BigInt(w.alert_paise);
  if (!(balanceAfter < alert && balanceAfter + chargedPaise >= alert)) return;
  // To each active Owner and Admin with an email (wallet alerts are email-only, S19).
  const admins = await sql()<{ email: string }[]>`
    select p.email from public.memberships m join public.user_profiles p on p.id = m.user_id
     where m.org_id = ${orgId} and m.status = 'active' and m.role in ('owner', 'admin') and p.email is not null`;
  for (const a of admins) {
    await queueMessage({
      orgId, channel: "email", recipientMasked: maskEmail(a.email), to: a.email, template: "wallet_low_balance",
      subject: "Your Chaanbean wallet is running low",
      body: `The wallet of ${w.legal_name} is down to ${formatInr(balanceAfter, { withPaise: true })}, below your alert amount of ${formatInr(alert)}. Add money from Plan and usage to keep checks running.`,
    });
  }
}
