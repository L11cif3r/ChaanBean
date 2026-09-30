import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth/admin-auth";

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
  const session = await verifyAdminSession(req);
  if (!session.authorized) {
    return NextResponse.json(
      { error: session.error || "Admin authentication required" },
      { status: session.status || 401 }
    );
  }

  const { role } = await req.json();
  const targetRole = role === "team_member" ? "team_member" : "owner";
  const admin = await prisma.adminUser.findFirst({
    where: { role: targetRole },
  });

  const res = NextResponse.json({ user: admin });
  res.cookies.set("chaanbean_admin_role", targetRole, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });
  return res;
}
