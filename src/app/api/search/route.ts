import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Search Buyers / Debtors
  const buyers = await prisma.buyerDebtor.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { gstin: { contains: q } },
        { pan: { contains: q } },
        { mobileNumbers: { contains: q } },
      ],
    },
    include: {
      creditAccounts: true,
      riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
    },
    take: 5,
  });

  // Search Vendors
  const vendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { gstin: { contains: q } },
        { pan: { contains: q } },
        { vendorTrustId: { contains: q } },
      ],
    },
    take: 4,
  });

  // Search Community Defaults
  const defaults = await prisma.communityDefault.findMany({
    where: {
      OR: [
        { debtorName: { contains: q } },
        { debtorGstin: { contains: q } },
        { debtorPan: { contains: q } },
      ],
    },
    take: 4,
  });

  // Search Trust Profiles
  const trustProfiles = await prisma.trustProfile.findMany({
    where: {
      OR: [
        { trustId: { contains: q } },
        { company: { name: { contains: q } } },
      ],
    },
    include: { company: true },
    take: 3,
  });

  const results: Array<{
    id: string;
    type: "debtor" | "vendor" | "default" | "trust_profile";
    title: string;
    subtitle: string;
    identifier: string;
    badge: string;
    badgeColor: "green" | "amber" | "red" | "sky";
    href: string;
  }> = [];

  for (const b of buyers) {
    const flag = (b.riskFlags[0]?.flag || "amber") as "green" | "amber" | "red";
    const acc = b.creditAccounts[0];
    results.push({
      id: b.id,
      type: "debtor",
      title: b.name,
      subtitle: `Outstanding: ₹${(acc?.outstandingAmount || 0).toLocaleString("en-IN")}`,
      identifier: b.gstin || b.pan || "No ID",
      badge: `${flag.toUpperCase()} RISK`,
      badgeColor: flag,
      href: `/buyers/${b.id}`,
    });
  }

  for (const v of vendors) {
    results.push({
      id: v.id,
      type: "vendor",
      title: v.name,
      subtitle: `Trust Score: ${v.trustScore}/100 · ${v.category}`,
      identifier: v.vendorTrustId || v.gstin || v.pan || "N/A",
      badge: v.kycStatus === "verified" ? "KYC VERIFIED" : "PENDING",
      badgeColor: v.kycStatus === "verified" ? "green" : "amber",
      href: "/vendors",
    });
  }

  for (const d of defaults) {
    results.push({
      id: d.id,
      type: "default",
      title: d.debtorName,
      subtitle: `Default Amount: ₹${d.amountDefaulted.toLocaleString("en-IN")}`,
      identifier: d.debtorGstin || d.debtorPan || "N/A",
      badge: "DEFAULTED",
      badgeColor: "red",
      href: "/trust-hub",
    });
  }

  for (const t of trustProfiles) {
    results.push({
      id: t.id,
      type: "trust_profile",
      title: t.company.name,
      subtitle: `Network Organization · Trust ID: ${t.trustId}`,
      identifier: t.trustId,
      badge: "NETWORK TRUST",
      badgeColor: "sky",
      href: "/trust-hub",
    });
  }

  return NextResponse.json({ results });
}
