// Provider status callback for Call Automation. Separate from the legacy /api/webhooks/exotel (legacy tenant
// model, unsigned). Authenticated by an HMAC over the attempt id (fails closed); the payload is never logged.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyAttemptStatus } from "@/lib/call-automation/engine";
import { verifyAttemptSignature } from "@/lib/call-automation/signing";
import { normalizeProviderStatus } from "@/lib/call-automation/status";

export const dynamic = "force-dynamic";

async function payload(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
    }
    const f = await req.formData();
    return Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

async function callback(req: Request) {
  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attempt") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !verifyAttemptSignature(attemptId, url.searchParams.get("sig"))) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Invalid callback signature." } }, { status: 401 });
  }
  const p = await payload(req);
  const status = normalizeProviderStatus(p.Status ?? p.CallStatus ?? p.status);
  const callSid = p.CallSid ?? p.Sid ?? p.call_sid;
  if (p.CustomField && p.CustomField !== attemptId) return NextResponse.json({ ok: true, applied: false, reason: "ATTEMPT_MISMATCH" });
  if (!status) return NextResponse.json({ ok: true, applied: false, reason: "UNRECOGNISED_STATUS" });

  const rows = await prisma.$queryRaw<{ provider_call_id: string | null }[]>`
    SELECT provider_call_id FROM call_attempts WHERE id = ${attemptId}::uuid`;
  if (!rows[0]) return NextResponse.json({ ok: true, applied: false, reason: "UNKNOWN_ATTEMPT" });
  // A signed callback for this attempt must refer to the call we placed.
  if (rows[0].provider_call_id && callSid && rows[0].provider_call_id !== callSid) {
    return NextResponse.json({ ok: true, applied: false, reason: "CALL_ID_MISMATCH" });
  }
  if (!rows[0].provider_call_id && callSid) {
    await prisma.$executeRaw`UPDATE call_attempts SET provider_call_id = ${callSid} WHERE id = ${attemptId}::uuid AND provider_call_id IS NULL`.catch(() => 0);
  }
  const dur = Number(p.ConversationDuration ?? p.Duration ?? p.DialCallDuration);
  const r = await applyAttemptStatus(attemptId, { status, durationSeconds: Number.isFinite(dur) ? dur : undefined, actor: "PROVIDER" });
  // Always 200 for a verified callback so the provider doesn't retry duplicates forever.
  return NextResponse.json({ ok: true, applied: r.applied });
}

export const POST = callback;
export const GET = callback; // Exotel can be configured to send GET callbacks.
