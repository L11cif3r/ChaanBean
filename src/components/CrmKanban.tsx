"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building,
  User,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";

export interface DealItem {
  id: string;
  title: string;
  value: number;
  probability: number;
  stageId: string;
  ownerId?: string | null;
  winLossReason?: string | null;
  companyId?: string | null;
  stageUpdatedAt: string;
  createdAt: string;
  lead?: {
    name: string;
    companyName: string;
    email: string;
    phone: string;
  } | null;
  company?: {
    id: string;
    name: string;
    plan: string;
    walletBalance: number;
  } | null;
  owner?: {
    name: string;
    email: string;
  } | null;
  activities?: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }[];
}

export interface StageItem {
  id: string;
  name: string;
  order: number;
  color: string;
  deals: DealItem[];
}

export function CrmKanban({
  initialStages,
  users,
  leads,
}: {
  initialStages: StageItem[];
  users: { id: string; name: string; email: string }[];
  leads: { id: string; name: string; companyName: string }[];
}) {
  const [stages, setStages] = useState<StageItem[]>(initialStages);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // New Deal Form State
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState("350000");
  const [newDealProb, setNewDealProb] = useState("50");
  const [newDealStage, setNewDealStage] = useState(stages[0]?.id || "");
  const [newDealLead, setNewDealLead] = useState(leads[0]?.id || "");
  const [newDealOwner, setNewDealOwner] = useState(users[0]?.id || "");

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadCompany, setNewLeadCompany] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("paid_search");

  // Move Deal to Next or Previous Stage
  const moveDealStage = async (dealId: string, currentStageId: string, direction: "next" | "prev") => {
    const currentIdx = stages.findIndex((s) => s.id === currentStageId);
    if (currentIdx === -1) return;
    const targetIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const targetStage = stages[targetIdx];
    setLoading(true);
    setActionMsg(null);

    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move_stage",
          dealId,
          newStageId: targetStage.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(`Deal moved to stage: "${targetStage.name}"`);
        // Update local state
        setStages((prev) =>
          prev.map((stage) => {
            if (stage.id === currentStageId) {
              return { ...stage, deals: stage.deals.filter((d) => d.id !== dealId) };
            }
            if (stage.id === targetStage.id) {
              const movingDeal = prev
                .find((s) => s.id === currentStageId)
                ?.deals.find((d) => d.id === dealId);
              if (!movingDeal) return stage;
              return {
                ...stage,
                deals: [
                  {
                    ...movingDeal,
                    stageId: targetStage.id,
                    stageUpdatedAt: new Date().toISOString(),
                    probability: data.deal?.probability || movingDeal.probability,
                  },
                  ...stage.deals,
                ],
              };
            }
            return stage;
          })
        );
      }
    } catch {
      setActionMsg("Failed to move deal.");
    } finally {
      setLoading(false);
    }
  };

  // Convert Won Deal to Customer Company
  const handleConvertToCompany = async (deal: DealItem) => {
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_to_company",
          dealId: deal.id,
          companyName: deal.lead?.companyName || deal.title,
          plan: "growth",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || "Customer company successfully provisioned!");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setActionMsg(data.error || "Failed to convert deal.");
      }
    } catch {
      setActionMsg("Network error converting deal.");
    } finally {
      setLoading(false);
    }
  };

  // Submit New Deal
  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_deal",
          title: newDealTitle,
          value: newDealValue,
          probability: newDealProb,
          stageId: newDealStage,
          leadId: newDealLead,
          ownerId: newDealOwner,
        }),
      });
      if (res.ok) {
        setShowCreateDeal(false);
        setNewDealTitle("");
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Submit New Lead
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadCompany) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_lead",
          name: newLeadName,
          companyName: newLeadCompany,
          email: newLeadEmail,
          phone: newLeadPhone,
          source: newLeadSource,
        }),
      });
      if (res.ok) {
        setShowCreateLead(false);
        setNewLeadName("");
        setNewLeadCompany("");
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const allDeals = stages.flatMap((s) => s.deals);
  const totalValue = allDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = allDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonDealsCount = stages.find((s) => s.name === "Won")?.deals.length || 0;
  const lostDealsCount = stages.find((s) => s.name === "Lost")?.deals.length || 0;
  const winRate =
    wonDealsCount + lostDealsCount > 0
      ? Math.round((wonDealsCount / (wonDealsCount + lostDealsCount)) * 100)
      : 72;

  return (
    <div className="space-y-6">
      {/* Top Metrics & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Total Pipeline</span>
            <span className="text-lg font-bold text-white">₹{totalValue.toLocaleString("en-IN")}</span>
          </div>

          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Weighted Pipeline</span>
            <span className="text-lg font-bold text-emerald-400">₹{Math.round(weightedValue).toLocaleString("en-IN")}</span>
          </div>

          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Win Rate</span>
            <span className="text-lg font-bold text-sky-400">{winRate}%</span>
          </div>

          <div className="rounded-lg bg-[#0B0F17] border border-slate-800 p-3 font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Avg Sales Cycle</span>
            <span className="text-lg font-bold text-amber-400">18.4 Days</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateLead(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Plus size={14} />
            Add Lead
          </button>
          <button
            onClick={() => setShowCreateDeal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            <Plus size={14} />
            Create Deal
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-lg bg-slate-900 border border-amber-800/60 p-3 text-xs font-mono text-amber-300 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-amber-400" />
          {actionMsg}
        </div>
      )}

      {/* Horizontal Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {stages.map((stage, stageIdx) => {
          const stageTotalValue = stage.deals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div
              key={stage.id}
              className="w-72 shrink-0 rounded-xl border border-slate-800 bg-[#0B0F17] flex flex-col min-h-[550px]"
            >
              {/* Stage Column Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-semibold text-xs text-slate-200">{stage.name}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px] font-mono text-slate-400">
                    {stage.deals.length}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-400">
                  ₹{(stageTotalValue / 100000).toFixed(1)}L
                </span>
              </div>

              {/* Deal Cards Container */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-900/80 p-3.5 text-xs space-y-2 hover:border-slate-700 transition shadow-sm cursor-pointer"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-semibold text-slate-100 text-xs line-clamp-2">
                        {deal.title}
                      </h4>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <p className="truncate text-slate-300 font-medium">
                        {deal.lead?.companyName || "Independent"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between font-mono pt-1">
                      <span className="font-bold text-white text-xs">
                        ₹{deal.value.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {deal.probability}% Win
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate max-w-[90px]">{deal.owner?.name || "Unassigned"}</span>
                      {/* Move Stage Buttons */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {stageIdx > 0 && (
                          <button
                            title="Move back"
                            onClick={() => moveDealStage(deal.id, stage.id, "prev")}
                            disabled={loading}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            <ArrowLeft size={10} />
                          </button>
                        )}
                        {stageIdx < stages.length - 1 && (
                          <button
                            title="Advance stage"
                            onClick={() => moveDealStage(deal.id, stage.id, "next")}
                            disabled={loading}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Conversion Action for Won Stage */}
                    {stage.name === "Won" && !deal.companyId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToCompany(deal);
                        }}
                        disabled={loading}
                        className="w-full mt-2 rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white transition flex items-center justify-center gap-1"
                      >
                        <Building size={10} />
                        Convert to Live Customer Company
                      </button>
                    )}

                    {deal.companyId && (
                      <div className="mt-1 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Linked Customer Company
                      </div>
                    )}
                  </div>
                ))}

                {stage.deals.length === 0 && (
                  <div className="rounded border border-dashed border-slate-800/60 p-4 text-center text-[11px] text-slate-600">
                    No deals in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-[10px] text-amber-400 uppercase">Deal Details</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedDeal.title}</h3>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 font-mono">
              <div><span className="text-slate-500">Value:</span> <strong className="text-white">₹{selectedDeal.value.toLocaleString("en-IN")}</strong></div>
              <div><span className="text-slate-500">Probability:</span> <strong className="text-emerald-400">{selectedDeal.probability}%</strong></div>
              <div><span className="text-slate-500">Company:</span> <span className="text-slate-200">{selectedDeal.lead?.companyName || "N/A"}</span></div>
              <div><span className="text-slate-500">Contact:</span> <span className="text-slate-200">{selectedDeal.lead?.name || "N/A"}</span></div>
              <div><span className="text-slate-500">Email:</span> <span className="text-slate-300">{selectedDeal.lead?.email || "—"}</span></div>
              <div><span className="text-slate-500">Phone:</span> <span className="text-slate-300">{selectedDeal.lead?.phone || "—"}</span></div>
            </div>

            {/* Activity History */}
            <div>
              <h4 className="font-semibold text-slate-300 text-xs mb-2">Deal Activity Audit Trail</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedDeal.activities?.map((act) => (
                  <div key={act.id} className="rounded bg-slate-900 p-2 border border-slate-800 font-mono text-[11px]">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span className="uppercase text-amber-400">{act.type}</span>
                      <span>{new Date(act.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedDeal(null)}
                className="rounded-lg border border-slate-700 px-4 py-1.5 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Deal */}
      {showCreateDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Deal</h3>
              <button onClick={() => setShowCreateDeal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateDealSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics Enterprise Contract"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Deal Value (INR)</label>
                  <input
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    value={newDealProb}
                    onChange={(e) => setNewDealProb(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Pipeline Stage</label>
                <select
                  value={newDealStage}
                  onChange={(e) => setNewDealStage(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateDeal(false)}
                  className="rounded px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-amber-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-amber-400 transition"
                >
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Lead */}
      {showCreateLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0B0F17] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add New Lead</h3>
              <button onClick={() => setShowCreateLead(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateLeadSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rao"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rao Industrial Supplies Ltd"
                  value={newLeadCompany}
                  onChange={(e) => setNewLeadCompany(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vikram@raosupplies.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98201 99887"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Acquisition Source</label>
                <select
                  value={newLeadSource}
                  onChange={(e) => setNewLeadSource(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                >
                  <option value="paid_search">Paid Search (Google Ads)</option>
                  <option value="referral">Referral / Word of Mouth</option>
                  <option value="whatsapp_inbound">WhatsApp Inbound</option>
                  <option value="trust_hub_referral">Trust Hub Peer Referral</option>
                  <option value="organic">Organic SEO</option>
                  <option value="partner">Channel Partner</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateLead(false)}
                  className="rounded px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-amber-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-amber-400 transition"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
