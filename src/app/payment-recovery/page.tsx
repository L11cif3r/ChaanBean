import { prisma } from "@/lib/db";
import Link from "next/link";
import { EscalationBadge } from "@/components/ui";
import { RecoveryActions } from "@/components/RecoveryActions";
import { CallAudioPlayer } from "@/components/CallAudioPlayer";
import { PaymentRecoveryWorkbench, type RecoveryAccountItem } from "@/components/recovery/PaymentRecoveryWorkbench";
import {
  Phone,
  FileText,
  Scale,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Radio,
  Clock,
  Send,
  Volume2,
  Gavel,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentRecoveryPage() {
  const company = await prisma.company.findFirst();

  const [accounts, allCalls, legalNotices, evidenceLogs] = await Promise.all([
    prisma.creditAccount.findMany({
      include: {
        buyer: true,
        escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
        legalNotices: { orderBy: { sentAt: "desc" } },
      },
      orderBy: { outstandingAmount: "desc" },
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

  // Format accounts for the interactive workbench
  const formattedAccounts: RecoveryAccountItem[] = accounts.map((a) => {
    let phone = "+91 98765 43210";
    try {
      const parsed = JSON.parse(a.buyer.mobileNumbers);
      if (Array.isArray(parsed) && parsed.length > 0) phone = parsed[0];
    } catch {
      // fallback
    }
    const daysOverdue = Math.max(0, Math.floor((Date.now() - a.dueDate.getTime()) / 86400000));

    return {
      id: a.id,
      buyerId: a.buyerId,
      buyerName: a.buyer.name,
      phone,
      email: a.buyer.email,
      language: a.buyer.language || "en",
      outstandingAmount: a.outstandingAmount,
      dueDate: a.dueDate.toISOString(),
      status: a.overdueStatus,
      currentLevel: a.escalationStates[0]?.currentLevel || "L1",
      daysOverdue,
      pan: a.buyer.pan,
      gstin: a.buyer.gstin,
    };
  });

  // Operations View Metrics
  const callsScheduled = allCalls.filter((c) => c.status === "scheduled").length;
  const callsCompleted = allCalls.filter((c) => c.status === "answered" || c.status === "busy" || c.status === "no_answer").length;

  const l1Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L1").length;
  const l2Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L2").length;
  const l3Count = accounts.filter((a) => a.escalationStates[0]?.currentLevel === "L3").length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FC8019]/10 border border-[#FC8019]/25 flex items-center justify-center text-[#FC8019]">
              <Phone size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Automated Payment Recovery Hub
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Deterministic policy engine (L1/L2/L3) · TRAI-compliant Asterisk/Vobiz voice bot · Immutable SHA-256 evidence trail
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-mono border border-slate-700">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span className="text-slate-300">Voice Window: 09:00–18:00 IST (TRAI)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-950/60 px-3 py-1.5 text-xs font-mono border border-amber-800/60 text-amber-400">
            <ShieldCheck size={13} />
            <span>BSA 2023 §63 Evidence Certificate</span>
          </div>
        </div>
      </div>

      {/* Futuristic 4-Stage Omnichannel Recovery Escalation Ladder */}
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-chaan-border pb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#FC8019]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Statutory 4-Stage Escalation Pipeline — Self-Explaining Progression
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Deterministic Policy Ladder</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stage 1 */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                STAGE 1 · DAYS 1–15
              </span>
              <Send size={13} className="text-sky-400" />
            </div>
            <h3 className="font-semibold text-white text-xs">L1 Polite Reminders</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automated WhatsApp &amp; Email ledger statement with instant 1-click UPI/NEFT payment link. Friendly tone without penal charges.
            </p>
          </div>

          {/* Stage 2 */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                STAGE 2 · DAYS 16–30
              </span>
              <Volume2 size={13} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white text-xs">L2 Firm Engagement</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Asterisk/Vobiz automated one-way voice bot in debtor&apos;s native dialect. Verbal reminder with formal promise-to-pay commitment.
            </p>
          </div>

          {/* Stage 3 */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="rounded bg-rose-950/80 text-rose-400 border border-rose-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                STAGE 3 · DAYS 31–45
              </span>
              <FileText size={13} className="text-rose-400" />
            </div>
            <h3 className="font-semibold text-white text-xs">L3 Statutory Demand</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Formal legal demand notice registered with Government Reference ID under MSMED §16 &amp; Negotiable Instruments Act §138.
            </p>
          </div>

          {/* Stage 4 */}
          <div className="rounded-xl border border-[#FC8019]/30 bg-[#FC8019]/10 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="rounded bg-[#FC8019]/20 text-[#FC8019] border border-[#FC8019]/40 px-2 py-0.5 text-[10px] font-mono font-bold">
                STAGE 4 · DAYS 45+
              </span>
              <Gavel size={13} className="text-[#FC8019]" />
            </div>
            <h3 className="font-semibold text-white text-xs">In-House Arbitration</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Automatic escalation to institutional dispute desk. 20.25% compound interest computation &amp; enforceable Aadhaar e-Sign settlement.
            </p>
          </div>
        </div>
      </section>

      {/* Self-Explained Executive Operations Metric Strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
          <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Scheduled Calls</p>
          <p className="text-2xl font-bold font-mono text-white">{callsScheduled}</p>
          <p className="text-[10px] text-slate-400">Due in next outbound dialing cycle</p>
        </div>

        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
          <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Completed Calls</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{callsCompleted}</p>
          <p className="text-[10px] text-slate-400">Answered &amp; recorded in audio ledger</p>
        </div>

        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
          <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">L1 Polite Reminders</p>
          <p className="text-2xl font-bold font-mono text-sky-400">{l1Count}</p>
          <p className="text-[10px] text-slate-400">WhatsApp &amp; Email ledger statements</p>
        </div>

        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
          <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">L2 Voice Notices</p>
          <p className="text-2xl font-bold font-mono text-amber-400">{l2Count}</p>
          <p className="text-[10px] text-slate-400">Voice bot multi-lingual engagement</p>
        </div>

        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
          <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">L3 Legal Demands</p>
          <p className="text-2xl font-bold font-mono text-rose-400">{l3Count}</p>
          <p className="text-[10px] text-slate-400">Formal legal demands with Gov reference</p>
        </div>
      </section>

      {/* Interactive Payment Recovery & OmniTrace 360 Command Center */}
      <PaymentRecoveryWorkbench accounts={formattedAccounts} />

      {/* Debtor Escalation Accounts Table */}
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-chaan-border">
          <div>
            <h2 className="text-base font-semibold text-white">Overdue Debtors &amp; Escalation Control</h2>
            <p className="text-xs text-slate-400">
              Real-time monitoring of overdue trade accounts with automated step-up actions.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{accounts.length} Monitored Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
              <tr>
                <th className="px-4 py-3 text-left">Debtor Name</th>
                <th className="px-4 py-3 text-left">Language</th>
                <th className="px-4 py-3 text-left">Outstanding Amount</th>
                <th className="px-4 py-3 text-left">Days Overdue</th>
                <th className="px-4 py-3 text-left">Current Escalation Level</th>
                <th className="px-4 py-3 text-left">Next Scheduled Action</th>
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
                      <Link href={`/buyers/${a.buyerId}`} className="hover:text-[#FC8019] transition">
                        {a.buyer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono uppercase text-slate-300 border border-slate-700">
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
        <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-[#FC8019]" />
              <h2 className="text-base font-semibold text-white">Asterisk / Vobiz Voice Dialing Events</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{allCalls.length} Attempts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
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
                        className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
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
        <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-rose-400" />
              <h2 className="text-base font-semibold text-white">Statutory Demand Notices (L3)</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{legalNotices.length} Served</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
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
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-chaan-border">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#FC8019]" />
              <h2 className="text-base font-semibold text-white">Immutable Legal Evidence Audit Trail</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Admissible under Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA / §65B IEA) with cryptographic SHA-256 hash chains.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">Cryptographically Hash-Linked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
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
                    <span className="uppercase font-bold text-[#FC8019] font-mono text-[11px] bg-[#FC8019]/10 border border-[#FC8019]/30 px-2 py-0.5 rounded">
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
