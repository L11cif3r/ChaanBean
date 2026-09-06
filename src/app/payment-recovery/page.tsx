import { prisma } from "@/lib/db";
import Link from "next/link";
import { EscalationBadge, SummaryCard } from "@/components/ui";
import { RecoveryActions } from "@/components/RecoveryActions";
import { CallAudioPlayer } from "@/components/CallAudioPlayer";
import { Phone, FileText, Scale, Activity, ShieldAlert, CheckCircle2, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentRecoveryPage() {
  const company = await prisma.company.findFirst();
  const campaigns = company
    ? await prisma.campaign.findMany({
        where: { companyId: company.id },
        include: { calls: { include: { buyer: true } } },
      })
    : [];

  const [accounts, allCalls, legalNotices, evidenceLogs] = await Promise.all([
    prisma.creditAccount.findMany({
      include: {
        buyer: true,
        escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
        legalNotices: { orderBy: { sentAt: "desc" } },
      },
    }),
    prisma.call.findMany({
      include: { buyer: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.legalNotice.findMany({
      include: { creditAccount: { include: { buyer: true } } },
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
    prisma.legalEvidenceLog.findMany({
      orderBy: { deliveredAt: "desc" },
      take: 10,
    }),
  ]);

  // Operations View Metrics
  const callsScheduled = allCalls.filter((c) => c.status === "scheduled").length;
  const callsInProgress = allCalls.filter((c) => c.status === "in_progress").length;
  const callsCompleted = allCalls.filter((c) => c.status === "answered" || c.status === "busy" || c.status === "no_answer").length;
  const callsFailed = allCalls.filter((c) => c.status === "failed").length;

  const l1Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L1").length;
  const l2Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L2").length;
  const l3Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L3").length;

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Phone className="text-chaan-accent" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Automated Payment Recovery Hub
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Temporal workflow orchestration · Deterministic Policy Engine (L1/L2/L3) · Asterisk/Vobiz Voice Dialing · S3 Audio Cache
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-mono border border-slate-700">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-slate-300">Voice Window: 09:00–18:00 IST (TRAI)</span>
          </div>
        </div>
      </div>

      {/* Real Operations View: Pipeline & Daily Call Status */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">Live Voice & Recovery Operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard title="Scheduled Calls" value={callsScheduled} subtitle="Due next cycle" />
          <SummaryCard title="Completed Today" value={callsCompleted} subtitle="Answered & logged" />
          <SummaryCard title="L1 Polite Reminders" value={l1Count} subtitle="WhatsApp / Email" />
          <SummaryCard title="L2 Firm Notices" value={l2Count} subtitle="Voice / Multi-channel" />
          <SummaryCard title="L3 Legal Demands" value={l3Count} subtitle="Gov Ref / Arbitration" />
        </div>
      </section>

      {/* Debtor Escalation Accounts */}
      <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
          <h2 className="text-base font-semibold text-white">Overdue Debtors & Escalation Control</h2>
          <span className="text-xs font-mono text-slate-400">{accounts.length} Monitored Accounts</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Debtor Name</th>
                <th className="px-4 py-3 text-left">Language</th>
                <th className="px-4 py-3 text-left">Outstanding Amount</th>
                <th className="px-4 py-3 text-left">Days Overdue</th>
                <th className="px-4 py-3 text-left">Current Escalation Level</th>
                <th className="px-4 py-3 text-left">Next Action At</th>
                <th className="px-4 py-3 text-left">Trigger Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.map((a) => {
                const esc = a.escalationStates[0];
                const daysOverdue = Math.max(
                  0,
                  Math.floor((Date.now() - a.dueDate.getTime()) / 86400000)
                );

                return (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      <Link href={`/buyers/${a.buyerId}`} className="hover:text-chaan-accent transition">
                        {a.buyer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300 border border-slate-700">
                        {a.buyer.language}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ₹{a.outstandingAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-400 font-bold">
                      {daysOverdue} Days
                    </td>
                    <td className="px-4 py-3">
                      <EscalationBadge level={esc?.currentLevel ?? "L1"} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {esc?.nextActionAt ? new Date(esc.nextActionAt).toLocaleString("en-IN") : "Immediate"}
                    </td>
                    <td className="px-4 py-3">
                      <RecoveryActions creditAccountId={a.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Call Logs & Legal Notices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outbound Voice Call Log */}
        <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-chaan-accent" />
              <h2 className="text-base font-semibold text-white">Asterisk / Vobiz Voice Dialing Events</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{allCalls.length} Attempts</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Debtor</th>
                  <th className="px-3 py-2 text-left">Attempt</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Duration</th>
                  <th className="px-3 py-2 text-left">Audio Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allCalls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2 font-medium text-slate-200">{c.buyer.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">#{c.attemptNo}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                          c.status === "answered"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : c.status === "busy"
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-rose-950 text-rose-400 border-rose-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">{c.durationSec}s</td>
                    <td className="px-3 py-2">
                      <CallAudioPlayer audioRef={c.audioRef} callId={c.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Legal Demand Notices with Gov Ref IDs */}
        <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-rose-400" />
              <h2 className="text-base font-semibold text-white">Statutory Demand Notices (L3)</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{legalNotices.length} Served</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Debtor</th>
                  <th className="px-3 py-2 text-left">Template ID</th>
                  <th className="px-3 py-2 text-left">Gov Reference ID</th>
                  <th className="px-3 py-2 text-left">Served At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {legalNotices.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-2 font-medium text-slate-200">
                      {n.creditAccount.buyer.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">{n.templateId}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400 font-bold">
                      {n.govReferenceId || "IT-GST-PENDING"}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">
                      {new Date(n.sentAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Immutable Legal Evidence Log Viewer */}
      <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
        <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-chaan-accent" />
            <h2 className="text-base font-semibold text-white">Immutable Legal Evidence Audit Trail</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Cryptographically Hash-Linked</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">SHA-256 Content Hash</th>
                <th className="px-4 py-3 text-left">Timestamp (IST)</th>
                <th className="px-4 py-3 text-left">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {evidenceLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <span className="uppercase font-bold text-sky-400 font-mono text-[11px]">
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-[11px] truncate max-w-xs">
                    {log.contentHash}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                    {new Date(log.deliveredAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[10px] max-w-md truncate">
                    {log.metadata || "—"}
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
