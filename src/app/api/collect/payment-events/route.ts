// Trusted payment signal: a payment received/reconciled elsewhere (Feature 2, a payment gateway job, ...).
// Authenticated by an HMAC over `${timestamp}.${rawBody}` (fails closed). The organisation comes from the SIGNED
// body, never from an unsigned header or query. Replays are harmless (idempotent on payment_ref).

import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/company-check/http";
import { AppError } from "@/lib/company-check/errors";
import { recordPaymentEvent } from "@/lib/call-automation/service";
import { verifyPaymentEvent } from "@/lib/call-automation/signing";

export const dynamic = "force-dynamic";

const envelope = z.object({ organisation_id: z.string().uuid() }).passthrough();

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!verifyPaymentEvent(req.headers.get("x-collect-timestamp"), req.headers.get("x-collect-signature"), raw)) {
      throw new AppError(401, "INVALID_SIGNATURE", "Invalid or expired signature.");
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new AppError(400, "INVALID_JSON", "The request body must be valid JSON.");
    }
    const { organisation_id, ...event } = envelope.parse(json);
    const r = await recordPaymentEvent(organisation_id, event);
    // 202 for "unmatched" so the sender doesn't retry for invoices that aren't being collected on.
    return NextResponse.json(r, { status: r.matched ? 200 : 202, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
