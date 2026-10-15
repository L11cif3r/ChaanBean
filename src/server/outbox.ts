import "server-only";
import { sql } from "@/server/db/sql";

// Messages to people outside the app (invites, email verification, access requests). Until Part 6 connects SMS,
// email and WhatsApp providers they are kept in a development outbox (/dev/outbox) instead of being sent.
// Never put an OTP in a message here.

export interface OutboxMessage {
  orgId?: string | null;
  channel: "sms" | "email" | "whatsapp";
  /** Masked recipient for display (maskMobile / maskEmail). */
  recipientMasked: string;
  template: string;
  subject?: string;
  body: string;
}

export async function queueMessage(m: OutboxMessage) {
  await sql()`
    insert into app_private.outbox_messages (org_id, channel, recipient_masked, template, subject, body)
    values (${m.orgId ?? null}::uuid, ${m.channel}, ${m.recipientMasked}, ${m.template}, ${m.subject ?? null}, ${m.body})`;
}
