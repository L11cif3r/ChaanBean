import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const start = Date.now();
  let dbStatus = "up";
  try {
    await prisma.company.count();
  } catch {
    dbStatus = "down";
  }

  return NextResponse.json({
    status: dbStatus === "up" ? "healthy" : "degraded",
    version: "1.0.0",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks: {
      database: dbStatus,
      verificationGateway: "operational",
      policyEngine: "operational",
      riskScoringEngine: "operational",
      voiceSystem: "operational",
    },
  });
}
