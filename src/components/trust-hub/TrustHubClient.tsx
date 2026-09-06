"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, ShieldCheck, Search, LayoutGrid } from "lucide-react";
import { TrustHubOverview } from "./TrustHubOverview";
import { BusinessVerificationView } from "./BusinessVerificationView";
import { VerifyBusinessView } from "./VerifyBusinessView";

interface TrustHubClientProps {
  profile: any;
  defaults: any[];
  vendors: any[];
}

export function TrustHubClient({
  profile,
  defaults,
  vendors,
}: TrustHubClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const idParam = searchParams.get("id") || "";

  const [activeTab, setActiveTab] = useState<"overview" | "business-verification" | "verify-id">(
    tabParam === "apply" || tabParam === "business-verification"
      ? "business-verification"
      : tabParam === "verify" || tabParam === "verify-id"
      ? "verify-id"
      : "overview"
  );

  const [prefilledTrustId, setPrefilledTrustId] = useState<string>(idParam);

  useEffect(() => {
    if (tabParam === "apply" || tabParam === "business-verification") {
      setActiveTab("business-verification");
    } else if (tabParam === "verify" || tabParam === "verify-id") {
      setActiveTab("verify-id");
      if (idParam) setPrefilledTrustId(idParam);
    } else if (!tabParam) {
      setActiveTab("overview");
    }
  }, [tabParam, idParam]);

  const switchTab = (tab: "overview" | "business-verification" | "verify-id", queryId?: string) => {
    setActiveTab(tab);
    if (queryId) setPrefilledTrustId(queryId);

    const targetQuery =
      tab === "overview"
        ? "/trust-hub"
        : tab === "business-verification"
        ? "/trust-hub?tab=apply"
        : `/trust-hub?tab=verify${queryId ? `&id=${encodeURIComponent(queryId)}` : ""}`;

    router.push(targetQuery);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-chaan-border pb-3">
        <button
          onClick={() => switchTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "overview"
              ? "bg-[#F44851] text-white shadow-md shadow-rose-950/40"
              : "border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <LayoutGrid size={15} />
          <span>Trust Hub Overview</span>
        </button>

        <button
          onClick={() => switchTab("business-verification")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "business-verification"
              ? "bg-[#F44851] text-white shadow-md shadow-rose-950/40"
              : "border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Shield size={15} />
          <span>Business Verification (Trust ID)</span>
          <span className="rounded bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-800/60">
            NEW
          </span>
        </button>

        <button
          onClick={() => switchTab("verify-id")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "verify-id"
              ? "bg-[#F44851] text-white shadow-md shadow-rose-950/40"
              : "border border-slate-700/60 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Search size={15} />
          <span>Check Verified Businesses</span>
          <span className="rounded bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-800/60">
            NEW
          </span>
        </button>
      </div>

      {/* View Content */}
      {activeTab === "overview" && (
        <TrustHubOverview
          profile={profile}
          defaults={defaults}
          vendors={vendors}
          onSelectTab={(tab) => switchTab(tab)}
        />
      )}

      {activeTab === "business-verification" && (
        <BusinessVerificationView
          onVerifiedSuccess={(newId) => switchTab("verify-id", newId)}
        />
      )}

      {activeTab === "verify-id" && (
        <VerifyBusinessView initialTrustId={prefilledTrustId} />
      )}
    </div>
  );
}
