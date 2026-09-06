import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const channels = await prisma.marketingChannel.findMany({
    include: {
      sources: true,
      attributions: {
        include: {
          lead: {
            include: { deals: { include: { stage: true } } },
          },
        },
      },
    },
  });

  const channelMetrics = channels.map((ch) => {
    const totalCost = ch.budget;
    const leads = ch.attributions.map((a) => a.lead);
    const count = leads.length;
    const allDeals = leads.flatMap((l) => l.deals);
    const wonDeals = allDeals.filter((d) => d.stage.name === "Won");
    const wonCount = wonDeals.length;
    const revenueWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const cpl = count > 0 ? Math.round(totalCost / count) : 0;
    const cac = wonCount > 0 ? Math.round(totalCost / wonCount) : 0;
    const convRate = count > 0 ? Math.round((wonCount / count) * 100) : 0;

    return {
      id: ch.id,
      name: ch.name,
      type: ch.type,
      budget: ch.budget,
      totalCost,
      leadsCount: count,
      wonCount,
      revenueWon,
      cpl,
      cac,
      convRate,
      sources: ch.sources,
    };
  });

  // Real Database-Driven Pipeline Stages from Deal table
  const stages = await prisma.pipelineStage.findMany({
    include: { deals: true },
    orderBy: { order: "asc" },
  });

  const pipelineStages = stages.map((s) => ({
    stage: s.name,
    order: s.order,
    color: s.color,
    count: s.deals.length,
    value: s.deals.reduce((sum, d) => sum + d.value, 0),
  }));

  // Trust Hub company-to-company referral breakdown
  const trustHubAttributions = await prisma.leadAttribution.findMany({
    where: { channel: { name: "trust_hub_referral" } },
    include: { lead: { include: { deals: { include: { stage: true } } } } },
  });

  return NextResponse.json({
    channels: channelMetrics,
    pipelineStages,
    funnel: pipelineStages,
    trustHubReferrals: {
      totalReferrals: trustHubAttributions.length,
      convertedCount: trustHubAttributions.filter((a) => a.lead.deals.some((d) => d.stage.name === "Won")).length,
    },
  });
}
