import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedRole = searchParams.get("role") || "owner";

  let adminUser = await prisma.adminUser.findFirst({
    where: { role: requestedRole },
  });

  if (!adminUser) {
    adminUser = await prisma.adminUser.findFirst();
  }

  return NextResponse.json({
    user: adminUser || {
      id: "admin-default",
      name: "Siddharth Verma",
      email: "owner@chaanbean.in",
      role: "owner",
    },
  });
}

export async function POST(req: Request) {
  const { role } = await req.json();
  const admin = await prisma.adminUser.findFirst({
    where: { role: role === "team_member" ? "team_member" : "owner" },
  });

  return NextResponse.json({ user: admin });
}
