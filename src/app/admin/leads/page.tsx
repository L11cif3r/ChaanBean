"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users2,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  PieChart,
  UserPlus,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building,
  DollarSign,
  Tag,
  ArrowRight,
  Shield,
  HelpCircle,
  Briefcase,
  ChevronRight,
  Plus,
  Share2,
  Lock,
} from "lucide-react";
import type { AdminLeadItem, AdvisorItem } from "@/lib/leads/types";
import { FeaturePriceItem } from "@/lib/pricing/pricing-engine";

export default function AdminLeadsPage() {
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [leads, setLeads] = useState<AdminLeadItem[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [internalNotes, setInternalNotes] = useState<any[]>([]);
  const [surveyAnalytics, setSurveyAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedLeadForReassign, setSelectedLeadForReassign] = useState<AdminLeadItem | null>(null);
  const [targetAdvisorId, setTargetAdvisorId] = useState<string>("");

  // Add Advisor Modal State
  const [addAdvisorModalOpen, setAddAdvisorModalOpen] = useState(false);
  const [newAdvName, setNewAdvName] = useState("");
  const [newAdvEmail, setNewAdvEmail] = useState("");
  const [newAdvPhone, setNewAdvPhone] = useState("");
  const [newAdvSpec, setNewAdvSpec] = useState("");

  // Internal Note State
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteTag, setNewNoteTag] = useState("Lead Strategy");
  const [selectedLeadForNote, setSelectedLeadForNote] = useState<string>("");

  // Feature Pricing State
  const [pricingList, setPricingList] = useState<FeaturePriceItem[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<number>(0);
  const [pricingNotice, setPricingNotice] = useState<string | null>(null);

  // Active Desk View Tab
  const [activeDeskView, setActiveDeskView] = useState<"leads_crm" | "ad_survey_visuals" | "pricing_editor" | "notes_ledger">("leads_crm");

  const fetchLeadsData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/leads?source=${selectedSource}&advisor=${selectedAdvisorFilter}`);
      const data = await res.json();
      if (data.leads) {
        setLeads(data.leads);
        setAdvisors(data.advisors);
        setInternalNotes(data.internalNotes);
        setSurveyAnalytics(data.surveyAnalytics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPricingData = async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      const data = await res.json();
      if (data.pricing) {
        const arr = Object.values(data.pricing) as FeaturePriceItem[];
        setPricingList(arr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeadsData();
    fetchPricingData();
  }, [selectedSource, selectedAdvisorFilter]);

  // Handle Owner Lead Reassignment
  const handleConfirmReassign = async () => {
    if (!selectedLeadForReassign || !targetAdvisorId) return;
    const adv = advisors.find((a) => a.id === targetAdvisorId);
    if (!adv) return;

    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reassign_lead",
          leadId: selectedLeadForReassign.id,
          targetAdvisorName: adv.name,
          targetAdvisorId: adv.id,
        }),
      });
      if (res.ok) {
        setReassignModalOpen(false);
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle CRM Disposition Update
  const handleUpdateDisposition = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_disposition",
          leadId,
          newStatus,
        }),
      });
      if (res.ok) {
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add Advisor
  const handleAddAdvisor = async () => {
    if (!newAdvName || !newAdvEmail) return;
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_advisor",
          name: newAdvName,
          email: newAdvEmail,
          phone: newAdvPhone,
          specialization: newAdvSpec,
        }),
      });
      if (res.ok) {
        setAddAdvisorModalOpen(false);
        setNewAdvName("");
        setNewAdvEmail("");
        setNewAdvPhone("");
        setNewAdvSpec("");
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add Internal Note
  const handleAddNote = async () => {
    if (!newNoteText) return;
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_note",
          leadId: selectedLeadForNote || undefined,
          author: "Owner (Siddharth Verma)",
          text: newNoteText,
          tag: newNoteTag,
        }),
      });
      if (res.ok) {
        setNewNoteText("");
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Owner Feature Cost Modification
  const handleSaveFeaturePrice = async (key: string, newPrice: number) => {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          key,
          price: newPrice,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingKey(null);
        setPricingNotice(`Updated ${key} to ₹${newPrice.toLocaleString("en-IN")}. Live payment gateways now charging this modified price!`);
        setTimeout(() => setPricingNotice(null), 5000);
        fetchPricingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.companyName.toLowerCase().includes(q) ||
      l.phone.includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Desk: Leads, Ad Funnel &amp; Feature Pricing</h1>
            <span className="rounded bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 text-[10px] font-mono text-amber-400 uppercase font-semibold">
              Owner Authority Mode
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ad attribution, 4-question client ad survey visuals, advisor assignment &amp; lead transfers, CRM disposition, and dynamic feature pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAddAdvisorModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition"
          >
            <UserPlus size={14} />
            <span>Add New Advisor</span>
          </button>
        </div>
      </div>

      {/* Desk Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveDeskView("leads_crm")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeDeskView === "leads_crm"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <Users2 size={14} />
          <span>Leads &amp; CRM Disposition ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveDeskView("ad_survey_visuals")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeDeskView === "ad_survey_visuals"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 size={14} />
          <span>4-Question Ad Survey Visuals</span>
          <span className="rounded bg-orange-950/80 px-1.5 py-0.2 text-[9px] font-mono text-orange-300 border border-orange-800/60">
            Visual Graphs
          </span>
        </button>

        <button
          onClick={() => setActiveDeskView("pricing_editor")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeDeskView === "pricing_editor"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign size={14} />
          <span>Dynamic Feature Pricing</span>
          <span className="rounded bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 border border-emerald-800/60">
            Backend Gateway Sync
          </span>
        </button>

        <button
          onClick={() => setActiveDeskView("notes_ledger")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeDeskView === "notes_ledger"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <Edit3 size={14} />
          <span>Internal Notes ({internalNotes.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. LEADS BY AD SOURCES & CRM DISPOSITION VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeDeskView === "leads_crm" && (
        <div className="space-y-6">
          {/* Ad Sources Bar & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Ad Source Selectors */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              {[
                { key: "all", label: "All Ad Sources" },
                { key: "facebook", label: "Facebook Ads" },
                { key: "instagram", label: "Instagram Ads" },
                { key: "youtube", label: "YouTube Ads" },
                { key: "direct", label: "Direct Interaction" },
                { key: "word_of_mouth", label: "Word of Mouth" },
              ].map((src) => (
                <button
                  key={src.key}
                  type="button"
                  onClick={() => setSelectedSource(src.key)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedSource === src.key
                      ? "bg-slate-800 text-[#FC8019] font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Filter by Advisor & Search */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
                <span className="text-slate-500">Advisor Filter:</span>
                <select
                  value={selectedAdvisorFilter}
                  onChange={(e) => setSelectedAdvisorFilter(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
                >
                  <option value="all" className="bg-slate-900">All Advisors ({advisors.length})</option>
                  {advisors.map((adv) => (
                    <option key={adv.id} value={adv.name} className="bg-slate-900">
                      {adv.name} ({adv.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-56">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search lead or org..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-[#FC8019]"
                />
              </div>
            </div>
          </div>

          {/* Active Advisors Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {advisors.map((adv) => {
              const leadCount = leads.filter((l) => l.assignedTo === adv.name).length;
              return (
                <div key={adv.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{adv.name}</span>
                    <span className="rounded bg-amber-950 text-amber-400 px-1.5 py-0.5 text-[9px] font-mono border border-amber-800/60 font-semibold">
                      {adv.role === "owner" ? "Owner" : "Advisor"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{adv.specialization}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-mono">
                    <span className="text-slate-500">Managed Leads:</span>
                    <strong className="text-[#FC8019]">{leadCount}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leads Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Prospect Leads &amp; CRM Pipeline</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Showing {filteredLeads.length} leads · Source: <strong className="text-white uppercase">{selectedSource}</strong>
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Owner authority: click advisor to reassign or change disposition
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Contact &amp; Organization</th>
                    <th className="py-3 px-3">Ad Source</th>
                    <th className="py-3 px-3">Ad Survey (GST / Credit / Status)</th>
                    <th className="py-3 px-3">Assigned Advisor (Owner Reassign)</th>
                    <th className="py-3 px-3">CRM Disposition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLeads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{lead.name}</div>
                          <div className="text-slate-300 text-[11px]">{lead.companyName}</div>
                          <div className="text-slate-500 font-mono text-[10px] mt-0.5">
                            {lead.phone} · {lead.email}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            lead.source === "facebook"
                              ? "bg-blue-950/80 text-blue-400 border border-blue-800/60"
                              : lead.source === "instagram"
                              ? "bg-pink-950/80 text-pink-400 border border-pink-800/60"
                              : lead.source === "youtube"
                              ? "bg-red-950/80 text-red-400 border border-red-800/60"
                              : lead.source === "word_of_mouth"
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                              : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                          }`}>
                            {lead.source.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[10px] space-y-0.5">
                          <div>
                            <span className="text-slate-500">GST: </span>
                            <strong className={lead.adSurvey.hasGst === "Yes" ? "text-emerald-400" : "text-slate-400"}>
                              {lead.adSurvey.hasGst}
                            </strong>
                            {" · "}
                            <span className="text-slate-500">Credit: </span>
                            <strong className="text-white">{lead.adSurvey.businessOnCredit}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Status: </span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                              lead.adSurvey.paymentStatus === "Defaulted" || lead.adSurvey.paymentStatus === "Both"
                                ? "bg-rose-950 text-rose-300"
                                : "bg-amber-950 text-amber-300"
                            }`}>
                              {lead.adSurvey.paymentStatus}
                            </span>
                          </div>
                        </td>

                        {/* Advisor Column with Owner Authority to Reassign */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadForReassign(lead);
                              setTargetAdvisorId(lead.assignedToId || "adv-2");
                              setReassignModalOpen(true);
                            }}
                            className="text-left group flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-[#FC8019] transition"
                            title="Click to transfer this lead to another advisor"
                          >
                            <span className="font-bold text-slate-200 text-xs group-hover:text-[#FC8019]">
                              {lead.assignedTo}
                            </span>
                            <Share2 size={12} className="text-slate-500 group-hover:text-[#FC8019]" />
                          </button>
                        </td>

                        {/* CRM Disposition Column */}
                        <td className="py-3 px-3">
                          <select
                            value={lead.status}
                            onChange={(e) => handleUpdateDisposition(lead.id, e.target.value)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold outline-none cursor-pointer border ${
                              lead.status === "new"
                                ? "bg-slate-800 text-slate-300 border-slate-700"
                                : lead.status === "contacted"
                                ? "bg-sky-950 text-sky-400 border-sky-800"
                                : lead.status === "qualified"
                                ? "bg-amber-950 text-amber-400 border-amber-800"
                                : lead.status === "demo_scheduled"
                                ? "bg-purple-950 text-purple-400 border-purple-800"
                                : lead.status === "in_negotiation"
                                ? "bg-orange-950 text-orange-400 border-orange-800"
                                : lead.status === "converted"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : "bg-rose-950 text-rose-400 border-rose-800"
                            }`}
                          >
                            <option value="new" className="bg-slate-900 text-slate-200">New Lead</option>
                            <option value="contacted" className="bg-slate-900 text-slate-200">Contacted</option>
                            <option value="qualified" className="bg-slate-900 text-slate-200">Qualified</option>
                            <option value="demo_scheduled" className="bg-slate-900 text-slate-200">Demo Scheduled</option>
                            <option value="in_negotiation" className="bg-slate-900 text-slate-200">In Negotiation</option>
                            <option value="converted" className="bg-slate-900 text-slate-200">Converted (Won)</option>
                            <option value="lost" className="bg-slate-900 text-slate-200">Lost</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadForNote(lead.id);
                              setActiveDeskView("notes_ledger");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-[#FC8019] hover:underline"
                          >
                            <Edit3 size={11} />
                            <span>Add Note</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. 4-QUESTION AD SURVEY VISUAL CHARTS & GRAPHS VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeDeskView === "ad_survey_visuals" && surveyAnalytics && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              Visual Survey Dashboard: Captured When Client Clicks Ad
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated statistical breakdown across all 4 mandatory survey queries answered during prospective client ad acquisition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Question 1: Do you have a GST number? */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-orange-500/20 text-[#FC8019] font-mono font-bold text-xs flex items-center justify-center">
                    Q1
                  </span>
                  <h3 className="font-bold text-white text-xs">Do you have a GST number?</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Total: {surveyAnalytics.totalSurveyed} Respondents</span>
              </div>

              {/* Visual Graph Bar */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Yes, Registered GSTIN ({surveyAnalytics.q1Gst.yesCount} Orgs)
                    </span>
                    <span className="text-emerald-400 font-bold">{surveyAnalytics.q1Gst.yesPct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${surveyAnalytics.q1Gst.yesPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                      No, Unregistered / Composition ({surveyAnalytics.q1Gst.noCount} Orgs)
                    </span>
                    <span className="text-slate-400 font-bold">{surveyAnalytics.q1Gst.noPct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: `${surveyAnalytics.q1Gst.noPct}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {surveyAnalytics.q1Gst.yesPct}% of clicking clients possess verified GSTIN registrations, qualifying them immediately for automated GSTR-3B filings and 30-day verification dossiers.
              </p>
            </div>

            {/* Question 2: Name of the organization & Sector */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-orange-500/20 text-[#FC8019] font-mono font-bold text-xs flex items-center justify-center">
                    Q2
                  </span>
                  <h3 className="font-bold text-white text-xs">Name of Organization &amp; Industry Classification</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Sector Segments</span>
              </div>

              {/* Vertical Bar Distribution */}
              <div className="space-y-2 text-xs font-mono">
                {Object.entries(surveyAnalytics.q2Org.industries).map(([ind, cnt]: [string, any], idx) => {
                  const pct = Math.round((cnt / (surveyAnalytics.totalSurveyed || 1)) * 100);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span className="truncate max-w-[240px]">{ind}</span>
                        <span className="font-bold text-amber-400">{cnt} orgs ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${Math.max(8, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question 3: Is your business on credit? */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-orange-500/20 text-[#FC8019] font-mono font-bold text-xs flex items-center justify-center">
                    Q3
                  </span>
                  <h3 className="font-bold text-white text-xs">Is your business on credit?</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Credit Term Reliance</span>
              </div>

              {/* Visual Meter */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#FC8019] font-bold flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FC8019]" />
                      Yes, Sells on Credit (30–90 Day Terms)
                    </span>
                    <span className="text-[#FC8019] font-bold">{surveyAnalytics.q3Credit.yesPct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#FC8019] rounded-full" style={{ width: `${surveyAnalytics.q3Credit.yesPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                      No, Advance Payment / Cash Only
                    </span>
                    <span className="text-slate-400 font-bold">{surveyAnalytics.q3Credit.noPct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-full" style={{ width: `${surveyAnalytics.q3Credit.noPct}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Over {surveyAnalytics.q3Credit.yesPct}% of clicking prospects depend directly on commercial trade credit, demonstrating strong alignment with ChaanBean&apos;s trade credit limits &amp; payment tenors.
              </p>
            </div>

            {/* Question 4: Is your payment delayed or defaulted? */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-orange-500/20 text-[#FC8019] font-mono font-bold text-xs flex items-center justify-center">
                    Q4
                  </span>
                  <h3 className="font-bold text-white text-xs">Is your payment delayed or defaulted?</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Delinquency Breakdown</span>
              </div>

              {/* 4 Status Bars */}
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-amber-400 font-bold">Delayed Payments (1–45 Days)</span>
                    <span className="text-amber-400 font-bold">{surveyAnalytics.q4Payment.delayedCount} leads ({surveyAnalytics.q4Payment.delayedPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${surveyAnalytics.q4Payment.delayedPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-rose-400 font-bold">Defaulted Payments (45+ Days)</span>
                    <span className="text-rose-400 font-bold">{surveyAnalytics.q4Payment.defaultedCount} leads ({surveyAnalytics.q4Payment.defaultedPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${surveyAnalytics.q4Payment.defaultedPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-purple-400 font-bold">Both Delayed &amp; Defaulted Accounts</span>
                    <span className="text-purple-400 font-bold">{surveyAnalytics.q4Payment.bothCount} leads ({surveyAnalytics.q4Payment.bothPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${surveyAnalytics.q4Payment.bothPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-bold">Neither / Healthy Payments</span>
                    <span className="text-slate-400 font-bold">{surveyAnalytics.q4Payment.neitherCount} leads ({surveyAnalytics.q4Payment.neitherPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: `${surveyAnalytics.q4Payment.neitherPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DYNAMIC FEATURE PRICING EDITOR (BACKEND GATEWAY SYNC) */}
      {/* ------------------------------------------------------------- */}
      {activeDeskView === "pricing_editor" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="text-emerald-400" size={18} />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Dynamic Feature Cost Management
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                As the Owner, you have complete authority to adjust the cost of any platform feature. Modifying a price updates the centralized backend engine immediately — all subsequent checkouts, add-on purchases, and payment gateways will automatically calculate and charge this updated price.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPricingData}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw size={13} />
              <span>Refresh Rates</span>
            </button>
          </div>

          {pricingNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{pricingNotice}</span>
            </div>
          )}

          {/* Pricing Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Feature Name &amp; Key</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Factory Default</th>
                    <th className="py-3 px-3">Live Active Price (Charged at Gateway)</th>
                    <th className="py-3 px-4 text-right">Owner Price Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pricingList.map((item) => {
                    const isEditing = editingKey === item.key;
                    return (
                      <tr key={item.key} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.key}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300 border border-slate-700">
                            {item.category.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-400">
                          ₹{item.defaultPrice.toLocaleString("en-IN")}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                value={editPriceVal}
                                onChange={(e) => setEditPriceVal(Number(e.target.value))}
                                className="w-24 bg-slate-950 border border-[#FC8019] rounded-lg p-1.5 text-xs text-white outline-none font-bold"
                              />
                            </div>
                          ) : (
                            <span className="text-emerald-400 font-bold text-sm">
                              ₹{item.price.toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveFeaturePrice(item.key, editPriceVal)}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-xs font-bold transition"
                              >
                                Save Price
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKey(null)}
                                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 text-xs transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingKey(item.key);
                                setEditPriceVal(item.price);
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-1 text-xs font-semibold transition"
                            >
                              Modify Cost
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. INTERNAL NOTES LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeDeskView === "notes_ledger" && (
        <div className="space-y-6 max-w-4xl">
          {/* Add New Note Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 size={15} className="text-[#FC8019]" />
              Add Internal Admin Note
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tag / Note Category</label>
                <select
                  value={newNoteTag}
                  onChange={(e) => setNewNoteTag(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
                >
                  <option value="Owner Directive">Owner Directive</option>
                  <option value="Lead Strategy">Lead Strategy</option>
                  <option value="Legal & Dispute Strategy">Legal &amp; Dispute Strategy</option>
                  <option value="Payment Promise">Payment Promise</option>
                  <option value="Underwriting Assessment">Underwriting Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Attach to Specific Lead (Optional)</label>
                <select
                  value={selectedLeadForNote}
                  onChange={(e) => setSelectedLeadForNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none"
                >
                  <option value="">General Platform Note</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.companyName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="Record internal observations, legal instructions, or borrower promissory logs..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#FC8019]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddNote}
                className="flex items-center gap-1.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] px-4 py-2 text-xs font-bold text-white transition"
              >
                <Plus size={14} />
                <span>Save Internal Note</span>
              </button>
            </div>
          </div>

          {/* Notes History List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Recorded Internal Notes Ledger ({internalNotes.length})
            </h4>

            {internalNotes.map((note) => (
              <div key={note.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#FC8019]">{note.author}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                      {note.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(note.timestamp).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: OWNER REASSIGN LEAD MODAL */}
      {/* ------------------------------------------------------------- */}
      {reassignModalOpen && selectedLeadForReassign && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1322] p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 size={16} className="text-[#FC8019]" />
                Owner Authority: Transfer Lead
              </h3>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 font-mono bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Target Lead: <strong className="text-white">{selectedLeadForReassign.name}</strong></div>
              <div className="text-slate-400">Organization: <strong className="text-slate-200">{selectedLeadForReassign.companyName}</strong></div>
              <div className="text-slate-400">Current Advisor: <strong className="text-amber-400">{selectedLeadForReassign.assignedTo}</strong></div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-mono text-slate-300 uppercase block">
                Select New Assigned Advisor:
              </label>
              <select
                value={targetAdvisorId}
                onChange={(e) => setTargetAdvisorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FC8019]"
              >
                {advisors.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name} — {adv.specialization} ({adv.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] px-4 py-2 text-xs font-bold text-white transition"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD ADVISOR */}
      {/* ------------------------------------------------------------- */}
      {addAdvisorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1322] p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus size={16} className="text-amber-400" />
                Add New Advisor
              </h3>
              <button
                type="button"
                onClick={() => setAddAdvisorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Advisor Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Ranganathan"
                  value={newAdvName}
                  onChange={(e) => setNewAdvName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Corporate Email</label>
                <input
                  type="email"
                  placeholder="anand.r@chaanbean.in"
                  value={newAdvEmail}
                  onChange={(e) => setNewAdvEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98000 12345"
                  value={newAdvPhone}
                  onChange={(e) => setNewAdvPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Domain Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. MSME Samadhaan & Fast-Track Decree"
                  value={newAdvSpec}
                  onChange={(e) => setNewAdvSpec(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAddAdvisorModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAdvisor}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition"
              >
                Save Advisor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
