import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const stages = await prisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
    include: {
      deals: {
        include: {
          stage: true,
          lead: true,
          company: true,
          owner: true,
          activities: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  const allDeals = stages.flatMap((s) => s.deals);
  const totalPipelineValue = allDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipelineValue = allDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonDeals = allDeals.filter((d) => d.stage.name === "Won");
  const lostDeals = allDeals.filter((d) => d.stage.name === "Lost");
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 65;

  const users = await prisma.adminUser.findMany();
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    stages,
    metrics: {
      totalPipelineValue,
      weightedPipelineValue,
      totalDealsCount: allDeals.length,
      wonDealsCount: wonDeals.length,
      lostDealsCount: lostDeals.length,
      winRate,
      avgDealSize: allDeals.length > 0 ? Math.round(totalPipelineValue / allDeals.length) : 0,
    },
    users,
    leads,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_lead") {
      const { name, companyName, email, phone, source = "organic", notes, assignedTo } = body;
      const lead = await prisma.lead.create({
        data: {
          name,
          companyName,
          email,
          phone,
          source,
          notes,
          assignedTo,
        },
      });

      // Track marketing attribution
      const channel = await prisma.marketingChannel.findFirst({
        where: { name: source },
      });
      if (channel) {
        await prisma.leadAttribution.create({
          data: {
            leadId: lead.id,
            channelId: channel.id,
            touchpointType: "first_touch",
          },
        });
      }

      return NextResponse.json({ success: true, lead });
    }

    if (action === "create_deal") {
      const { title, value, probability, stageId, leadId, ownerId } = body;
      const deal = await prisma.deal.create({
        data: {
          title,
          value: parseFloat(value) || 0,
          probability: parseInt(probability) || 50,
          stageId,
          leadId: leadId || null,
          ownerId: ownerId || null,
          stageUpdatedAt: new Date(),
        },
      });

      await prisma.salesActivity.create({
        data: {
          dealId: deal.id,
          leadId: deal.leadId,
          type: "deal_created",
          description: `Deal "${deal.title}" created with pipeline value ₹${deal.value.toLocaleString("en-IN")}`,
          performedBy: ownerId || null,
        },
      });

      return NextResponse.json({ success: true, deal });
    }

    if (action === "move_stage") {
      const { dealId, newStageId, winLossReason } = body;
      const stage = await prisma.pipelineStage.findUnique({ where: { id: newStageId } });
      if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

      const deal = await prisma.deal.update({
        where: { id: dealId },
        data: {
          stageId: newStageId,
          winLossReason: winLossReason || null,
          stageUpdatedAt: new Date(),
          closedAt: stage.name === "Won" || stage.name === "Lost" ? new Date() : null,
          probability:
            stage.name === "Won"
              ? 100
              : stage.name === "Lost"
                ? 0
                : stage.name === "Negotiation"
                  ? 80
                  : stage.name === "Proposal Sent"
                    ? 60
                    : 40,
        },
        include: { lead: true },
      });

      await prisma.salesActivity.create({
        data: {
          dealId,
          leadId: deal.leadId,
          type: "stage_change",
          description: `Moved deal to stage: "${stage.name}"${winLossReason ? ` (Reason: ${winLossReason})` : ""}`,
        },
      });

      return NextResponse.json({ success: true, deal, stageName: stage.name });
    }

    if (action === "convert_to_company") {
      const { dealId, companyName, plan = "growth" } = body;
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: { lead: true },
      });

      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

      const name = companyName || deal.lead?.companyName || deal.title;
      const company = await prisma.company.create({
        data: {
          name,
          plan,
          walletBalance: 200000,
          kycStatus: "verified",
          healthScore: "Healthy",
          signupDate: new Date(),
          lastActiveAt: new Date(),
        },
      });

      await prisma.deal.update({
        where: { id: dealId },
        data: {
          companyId: company.id,
          stageId: (await prisma.pipelineStage.findFirst({ where: { name: "Won" } }))?.id || deal.stageId,
          closedAt: new Date(),
          probability: 100,
        },
      });

      await prisma.salesActivity.create({
        data: {
          dealId,
          type: "company_converted",
          description: `Deal converted! Live customer company "${company.name}" provisioned on ${plan} plan with ₹2,00,000 wallet balance.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Company "${company.name}" successfully created and linked to Won deal.`,
        company,
      });
    }

    if (action === "add_activity") {
      const { dealId, leadId, type, description, performedBy } = body;
      const activity = await prisma.salesActivity.create({
        data: {
          dealId: dealId || null,
          leadId: leadId || null,
          type: type || "note",
          description,
          performedBy: performedBy || null,
        },
      });

      return NextResponse.json({ success: true, activity });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline operation error" },
      { status: 500 }
    );
  }
}
