import { prisma } from "@/lib/db";
import { VendorWizard } from "@/components/VendorWizard";
import { Users, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const company = await prisma.company.findFirst();
  if (!company) return <div className="p-8 text-slate-400">Company not found.</div>;

  const vendors = await prisma.vendor.findMany({
    where: { companyId: company.id },
    orderBy: { onboardingDate: "desc" },
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-chaan-accent" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Vendor Registration & Onboarding</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Multi-category onboarding, automated KYC verification (PAN, GSTIN, CIN), and Trust ID assignment.
          </p>
        </div>
      </div>

      {/* Onboarding Wizard & Bulk Tool */}
      <VendorWizard companyId={company.id} />

      {/* Registered Vendors Table */}
      <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
          <h2 className="text-base font-semibold text-white">Registered Vendor Network</h2>
          <span className="text-xs font-mono text-slate-400">{vendors.length} Vendors Active</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Vendor Name</th>
                <th className="px-4 py-3 text-left">Vendor Trust ID</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">GSTIN / PAN</th>
                <th className="px-4 py-3 text-left">Turnover Range</th>
                <th className="px-4 py-3 text-left">KYC Status</th>
                <th className="px-4 py-3 text-left">Trust Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-medium text-slate-200">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-sky-400 font-semibold">{v.vendorTrustId}</td>
                  <td className="px-4 py-3 text-slate-300">{v.category}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{v.gstin || v.pan || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{v.turnoverRange || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-2 py-0.5 text-[11px] font-mono text-emerald-400 border border-emerald-800/60">
                      <ShieldCheck size={12} />
                      Verified
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {v.trustScore}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
