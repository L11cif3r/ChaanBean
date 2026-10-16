import { z } from "zod";
import { CONSENT_CHANNELS, CONSENT_PURPOSES } from "@/lib/consent";

// Request bodies shared by the check routes.
export const personSchema = z.object({
  sameAsContact: z.boolean(),
  name: z.string().trim().max(120),
  pan: z.string().trim().max(10),
  birthDate: z.string().max(10),
  mobile: z.string().max(15).optional(),
});

export const itemsSchema = z.array(z.string().max(40)).min(1, "Select at least one check.").max(20);

export const startSchema = z.object({
  quoteId: z.uuid("Check the cost again before running."),
  counterpartyId: z.uuid(),
  items: itemsSchema,
  mode: z.enum(["together", "manual"]).default("together"),
  consent: z
    .object({
      purpose: z.enum(CONSENT_PURPOSES, "Select a purpose."),
      channels: z.array(z.enum(CONSENT_CHANNELS)).min(1, "Choose at least one way to send the request.").max(3),
    })
    .optional(),
  person: personSchema.optional(),
});

/** v3 section 15: POST endpoints that charge take an Idempotency-Key, so a repeated click never charges twice. */
export function idempotencyKey(req: Request) {
  const key = req.headers.get("idempotency-key")?.trim();
  return key && /^[A-Za-z0-9_-]{8,100}$/.test(key) ? key : null;
}
