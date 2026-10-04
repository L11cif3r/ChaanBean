import { NextResponse } from "next/server";
import { prisma, isNeonAdapterActive } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "connected";
  let errorMessage: string | null = null;

  try {
    // Quick lightweight query to confirm database responsiveness
    await prisma.company.count();
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("[health] Database health check failed:", rawMsg);
    // Sanitize credentials out of error message before responding
    errorMessage = rawMsg.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
    dbStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      database: dbStatus,
      neonAdapter: isNeonAdapterActive(),
      timestamp: new Date().toISOString(),
      ...(isHealthy
        ? {}
        : {
            error: errorMessage,
            dbConfigured: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
          }),
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
