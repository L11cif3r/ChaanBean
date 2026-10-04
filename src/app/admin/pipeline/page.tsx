import { prisma } from "@/lib/db";
import { CrmKanban, type StageItem } from "@/components/CrmKanban";
import { GitPullRequest, Layers, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPipelinePage() {
  const [stagesData, users, leads] = await Promise.all([
    prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
      include: {
        deals: {
          include: {
            lead: true,
            company: true,
            owner: true,
            activities: { orderBy: { createdAt: "desc" }, take: 5 },
          },
          orderBy: { stageUpdatedAt: "desc" },
        },
      },
    }),
    prisma.adminUser.findMany({
      select: { id: true, name: true, email: true },
    }),
    prisma.lead.findMany({
      select: { id: true, name: true, companyName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stages: StageItem[] = stagesData.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    color: s.color,
    deals: s.deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value,
      probability: d.probability,
      stageId: d.stageId,
      ownerId: d.ownerId,
      winLossReason: d.winLossReason,
      companyId: d.companyId,
      stageUpdatedAt: d.stageUpdatedAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
      lead: d.lead
        ? {
            name: d.lead.name,
            companyName: d.lead.companyName,
            email: d.lead.email,
            phone: d.lead.phone,
          }
        : null,
      company: d.company
        ? {
            id: d.company.id,
            name: d.company.name,
            plan: d.company.plan,
            walletBalance: d.company.walletBalance,
          }
        : null,
      owner: d.owner ? { name: d.owner.name, email: d.owner.email } : null,
      activities: d.activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    })),
  }));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="text-amber-400" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Sales Pipeline CRM</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Interactive Kanban board · Stage transitions logged with timestamps · Convert Won deals to live customer companies
          </p>
        </div>
      </div>

      {/* CRM Kanban Component */}
      <CrmKanban initialStages={stages} users={users} leads={leads} />
    </div>
  );
}
