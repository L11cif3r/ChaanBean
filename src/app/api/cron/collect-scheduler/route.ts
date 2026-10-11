// Scheduler tick for a cron caller (Vercel Cron / external). Bearer CRON_SECRET; fails closed if unset.
// Registered in vercel.json (every 5 minutes; Vercel sends GET with Authorization: Bearer $CRON_SECRET).

import crypto from "crypto";
import { NextResponse } from "next/server";
import { reconcileOpenAttempts, runDueSchedules } from "@/lib/call-automation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function tick(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: { code: "UNAUTHORISED", message: "Unauthorised." } }, { status: 401 });
  const reconcile = await reconcileOpenAttempts(new Date(), { minAgeSeconds: 30 });
  const schedule = await runDueSchedules(new Date());
  return NextResponse.json({ schedule, reconcile }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = tick;
export const POST = tick;
