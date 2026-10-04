import { NextResponse } from "next/server";
import { logAuditEvent, getRecentAuditEvents, type ChaanBeanEventType } from "@/lib/events/audit-events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = (searchParams.get("type") as ChaanBeanEventType) || undefined;
    const events = getRecentAuditEvents(limit, type);
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch audit events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventType, userId, companyId, metadata } = body;
    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }
    const logged = await logAuditEvent(eventType, { userId, companyId, metadata });
    return NextResponse.json({ success: true, event: logged });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record audit event" }, { status: 500 });
  }
}
