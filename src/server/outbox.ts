import "server-only";
import { sql } from "@/server/db/sql";
import { MOCK, primary } from "@/server/providers/registry";
import { refuse } from "@/server/providers/slots";

// Messages to people outside the app (invites, consent and agreement links, alerts). Each channel has its own
// provider (PROVIDER_SMS, PROVIDER_WHATSAPP, PROVIDER_EMAIL): the dummy keeps the message in the development outbox
// (/dev/outbox) instead of sending it; Exotel (SMS, WhatsApp) and Amazon SES (email) plug in as senders below.
// Every message is recorded in the outbox with the masked recipient, whichever provider sends it.
// Never put an OTP in a message here: OTPs go through the OTP sender (src/server/providers/otp).

export type Channel = "sms" | "email" | "whatsapp";

export interface OutboxMessage {
  orgId?: string | null;
  channel: Channel;
  /** Masked recipient for display and the record (maskMobile / maskEmail). */
  recipientMasked: string;
  /** Full recipient, used only by a real sender and never stored. */
  to?: string;
  template: string;
  subject?: string;
  body: string;
}

/** A real sender: returns the provider's message id (for delivery-status webhooks, v3 FR-BS-03). */
export interface MessageSender {
  name: string;
  send(m: OutboxMessage & { to: string }): Promise<{ providerMessageId: string }>;
}

/** Real senders by provider name (docs/PROVIDERS.md). Until one is added, choosing it refuses loudly. */
const REAL: Record<string, MessageSender> = {};

export async function queueMessage(m: OutboxMessage) {
  const name = primary(m.channel);
  if (name !== MOCK) {
    const sender = REAL[name];
    if (!sender) refuse(name, `${m.channel} messages`);
    if (!m.to) throw new Error(`${name}: no recipient for a ${m.channel} message (${m.template})`);
    await sender.send({ ...m, to: m.to });
  }
  await sql()`
    insert into app_private.outbox_messages (org_id, channel, recipient_masked, template, subject, body)
    values (${m.orgId ?? null}::uuid, ${m.channel}, ${m.recipientMasked}, ${m.template}, ${m.subject ?? null}, ${m.body})`;
}
