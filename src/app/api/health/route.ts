import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "connected";

  try {
    // Quick lightweight query to confirm database responsiveness
    await prisma.company.count();
  } catch (err) {
    console.error("[health] Database health check failed:", err);
    dbStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
