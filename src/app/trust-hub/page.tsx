import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { TrustHubClient } from "@/components/trust-hub/TrustHubClient";

export const dynamic = "force-dynamic";

export default async function TrustHubPage() {
  const [profile, defaults, vendors] = await Promise.all([
    prisma.trustProfile.findFirst({ include: { company: true } }),
    prisma.communityDefault.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.vendor.findMany({
      where: { status: "active" },
      take: 6,
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
          <p className="text-xs">Loading Trust Hub & Network...</p>
        </div>
      }
    >
      <TrustHubClient
        profile={profile}
        defaults={defaults}
        vendors={vendors}
      />
    </Suspense>
  );
}
