"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import s from "./collect.module.css";
import {
  ApiError, api, attemptTone, automationTone, caseTone, eventText, failureText, fmtDate, fmtDateTime, inr, stopReason,
} from "./client";
import { Chip, ProviderBanner, Toast } from "./ui";

interface Attempt {
  id: string; trigger: string; provider: string; status: string; scheduled_for: string | null; initiated_at: string | null;
  accepted_at: string | null; answered_at: string | null; completed_at: string | null; duration_seconds: number | null;
  failure_reason: string | null; created_at: string;
}
interface Ev { id: string; event_type: string; actor_type: string; occurred_at: string; attempt_id: string | null; metadata: Record<string, unknown> }
interface Auto { state: string; frequency: string; next_call_at: string | null; max_attempts: number; attempt_count: number; stop_reason: string | null }
interface Case {
  id: string; invoice_id: string | null; debtor_name: string; phone_last4: string; amount_due_paise: number; amount_original_paise: number; due_date: string;
  days_overdue: number; language: string; status: string; contact_authority: string; promised_pay_date: string | null;
  promised_amount_paise: number | null; automation: Auto | null;
}
interface Pay { id: string; payment_ref: string; amount_paise: number; source: string; created_at: string }
interface Detail { case: Case; payments: Pay[]; attempts: Attempt[]; events: Ev[]; provider: { name: string; ready: boolean; reason?: string } }

const FREQ: Record<string, string> = { DAILY: "Every day", EVERY_2_DAYS: "Every 2 days", WEEKLY: "Every week" };

export default function CaseDetail({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [freq, setFreq] = useState("DAILY");
  const [max, setMax] = useState(3);
  const [promise, setPromise] = useState("");
  const [payAmt, setPayAmt] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<Detail>(`/api/collect/cases/${id}`);
      setD(r);
      setError(null);
      return r;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this case.");
      return null;
    }
  }, [id]);

  // Callbacks can be late or lost, so open attempts are reconciled with the provider's status API.
  const sync = useCallback(async () => {
    await api(`/api/collect/cases/${id}/sync`, { method: "POST" }).catch(() => undefined);
    return load();
  }, [id, load]);

  useEffect(() => { void sync(); }, [sync]);
  const open = d?.attempts.some((a) => a.status === "INITIATED" || a.status === "ANSWERED" || a.status === "QUEUED");
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => void sync(), 8000);
    return () => clearInterval(t);
  }, [open, sync]);
  useEffect(() => {
    const a = d?.case.automation;
    if (a) { setFreq(a.frequency); setMax(a.max_attempts); }
  }, [d?.case.automation?.frequency, d?.case.automation?.max_attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string) {
    setBusy(key);
    try {
      await fn();
      await load();
      setToast({ kind: "ok", message: okMsg });
    } catch (e) {
      setToast({ kind: "err", message: e instanceof ApiError ? e.message : "That didn't work. Try again." });
    } finally {
      setBusy(null);
    }
  }
  const action = (payload: object) => api(`/api/collect/cases/${id}/actions`, { method: "POST", body: JSON.stringify(payload) });
  const control = (op: string) => api(`/api/collect/cases/${id}/automation`, { method: "PATCH", body: JSON.stringify({ op }) });
  const confirmAction = (msg: string) => typeof window === "undefined" || window.confirm(msg);

  if (error && !d) {
    return (
      <div className={s.root}>
        <Link href="/collect" className={s.back}>← All cases</Link>
        <div className={`${s.banner} ${s.bannerErr}`} role="alert">{error}</div>
      </div>
    );
  }
  if (!d) return <div className={s.root}><div className={s.empty}>Loading case...</div></div>;

  const c = d.case;
  const a = c.automation;
  const ct = caseTone(c.status);
  const at = automationTone(a);
  const isOpen = c.status === "ACTIVE" || c.status === "DISPUTED";
  const confirmed = c.contact_authority === "CONFIRMED";
  const canCall = c.status === "ACTIVE" && confirmed && d.provider.ready;

  return (
    <div className={s.root}>
      <Link href="/collect" className={s.back}>← All cases</Link>
      <div className={s.pageHead}>
        <div>
          <h1 className={s.title}>{c.debtor_name}</h1>
          <p className={`${s.sub} ${s.mono}`}>
            +91 ••••• ••{c.phone_last4} · {c.language === "hi" ? "Hindi" : "English"}{c.invoice_id ? ` · Invoice ${c.invoice_id}` : ""}
          </p>
        </div>
        <div className={s.btnRow}>
          <Chip tone={ct.tone}>{ct.label}</Chip>
          <Chip tone={at.tone}>Automation: {at.label}</Chip>
        </div>
      </div>

      <ProviderBanner provider={d.provider} />

      <div className={s.stats}>
        <div className={s.stat}><div className={s.statLabel}>Amount due</div><div className={s.statValue}>{inr(c.amount_due_paise)}</div>{c.amount_original_paise !== c.amount_due_paise && <div className={`${s.small} ${s.muted}`}>of {inr(c.amount_original_paise)}</div>}</div>
        <div className={s.stat}>
          <div className={s.statLabel}>Due date</div>
          <div className={s.statValue}>{fmtDate(c.due_date)}</div>
          {c.days_overdue > 0 && isOpen && <div className={`${s.small} ${s.muted}`}>{c.days_overdue} days overdue</div>}
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>Attempts</div>
          <div className={s.statValue}>{a ? `${a.attempt_count} / ${a.max_attempts}` : "-"}</div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>Next call</div>
          <div className={s.statValue} style={{ fontSize: 17 }}>{a?.state === "ACTIVE" ? fmtDateTime(a.next_call_at) : "-"}</div>
          {a && a.state !== "ACTIVE" && stopReason(a.stop_reason) && <div className={`${s.small} ${s.muted}`}>{stopReason(a.stop_reason)}</div>}
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={`${s.card} ${s.cardPad}`}>
            <div className={s.cardTitle}>Automation</div>
            {c.status !== "ACTIVE" ? (
              <p className={s.muted}>
                {c.status === "DISPUTED" ? "Calls are paused while the case is disputed. Resolve the dispute, then resume automation." : `This case is ${ct.label.toLowerCase()}, so no calls will be placed.`}
              </p>
            ) : (
              <div className={s.stack}>
                {!confirmed && (
                  <div className={s.consent}>
                    <div>
                      <b>Confirm you may contact this person.</b>
                      <div className={s.hint}>
                        Automated calls are only enabled once you confirm you have the right to contact this number about this debt.
                        You can withdraw this at any time.
                      </div>
                    </div>
                    <div>
                      <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!!busy}
                        onClick={() => run("auth", () => action({ action: "CONFIRM_CONTACT_AUTHORITY" }), "Contact permission confirmed.")}>
                        I confirm
                      </button>
                    </div>
                  </div>
                )}
                <div className={s.form} style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="freq">Call frequency</label>
                    <select id="freq" className={s.input} value={freq} onChange={(e) => setFreq(e.target.value)} disabled={!confirmed}>
                      {Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="max">Maximum attempts</label>
                    <input id="max" type="number" min={1} max={10} className={s.input} value={max} disabled={!confirmed}
                      onChange={(e) => setMax(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
                  </div>
                </div>
                <p className={s.hint}>Calls are only placed between 9:00 am and 6:00 pm IST. Outside those hours the next call waits for 9:00 am.</p>
                <div className={s.btnRow}>
                  <button className={`${s.btn} ${s.btnPrimary}`} disabled={!confirmed || !!busy}
                    onClick={() => run("cfg", () => (a && a.state !== "COMPLETED")
                      ? api(`/api/collect/cases/${id}/automation`, { method: "PATCH", body: JSON.stringify({ op: "UPDATE", frequency: freq, max_attempts: max }) })
                      : api(`/api/collect/cases/${id}/automation`, { method: "POST", body: JSON.stringify({ frequency: freq, max_attempts: max }) }), a ? "Automation updated." : "Automation started.")}>
                    {a ? (a.state !== "COMPLETED" ? "Save changes" : "Save and restart") : "Start automation"}
                  </button>
                  {a?.state === "ACTIVE" && <button className={s.btn} disabled={!!busy} onClick={() => run("pause", () => control("PAUSE"), "Automation paused.")}>Pause</button>}
                  {a?.state === "PAUSED" && <button className={s.btn} disabled={!!busy} onClick={() => run("resume", () => control("RESUME"), "Automation resumed.")}>Resume</button>}
                  {a && a.state !== "COMPLETED" && (
                    <button className={`${s.btn} ${s.btnDanger}`} disabled={!!busy}
                      onClick={() => confirmAction("Stop automation for this case? No further calls will be scheduled.") && run("stop", () => control("STOP"), "Automation stopped.")}>
                      Stop
                    </button>
                  )}
                </div>
                <div className={s.btnRow} style={{ alignItems: "center" }}>
                  <button className={s.btn} disabled={!canCall || !!busy}
                    onClick={() => confirmAction("Place a call to this person now?") && run("call", async () => {
                      const r = await api<{ outcome: string }>(`/api/collect/cases/${id}/call`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
                      if (r.outcome !== "accepted") throw new ApiError(r.outcome === "rejected" ? "The provider rejected the call request." : "The call wasn't placed.", "CALL_NOT_PLACED", 0);
                    }, "Call request accepted by the provider.")}>
                    Call now
                  </button>
                  {confirmed && <button className={`${s.btn} ${s.btnSm}`} disabled={!!busy}
                    onClick={() => confirmAction("Withdraw contact permission? Automation will be paused.") && run("wd", () => action({ action: "WITHDRAW_CONTACT_AUTHORITY" }), "Contact permission withdrawn.")}>
                    Withdraw contact permission
                  </button>}
                </div>
              </div>
            )}
          </div>

          <div className={`${s.card} ${s.cardPad}`}>
            <div className={s.cardTitle}>Case actions</div>
            {c.promised_pay_date && (
              <p className={s.hint} style={{ marginBottom: 10 }}>
                Promised to pay{c.promised_amount_paise ? ` ${inr(c.promised_amount_paise)}` : ""} on {fmtDate(c.promised_pay_date)}. Calls wait until the day after.
              </p>
            )}
            {isOpen ? (
              <div className={s.stack}>
                <div className={s.btnRow}>
                  <button className={`${s.btn} ${s.btnPrimary}`} disabled={!!busy}
                    onClick={() => {
                      const amt = payAmt.trim() === "" ? undefined : Math.round(Number(payAmt) * 100);
                      if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) { setToast({ kind: "err", message: "Enter a valid amount." }); return; }
                      const full = amt === undefined || amt >= c.amount_due_paise;
                      if (!confirmAction(full ? "Record this invoice as fully paid? Calls will stop." : `Record a partial payment of ${inr(amt!)}?`)) return;
                      void run("pay", async () => { await action({ action: "RECORD_PAYMENT", payment_ref: `ui:${crypto.randomUUID()}`, ...(amt !== undefined ? { amount_paise: amt } : {}) }); setPayAmt(""); }, full ? "Payment recorded. Calls stopped." : "Partial payment recorded.");
                    }}>
                    Record payment
                  </button>
                  {c.status === "ACTIVE"
                    ? <button className={s.btn} disabled={!!busy} onClick={() => run("dis", () => action({ action: "RAISE_DISPUTE" }), "Dispute raised. Calls paused.")}>Mark disputed</button>
                    : <button className={s.btn} disabled={!!busy} onClick={() => run("res", () => action({ action: "RESOLVE_DISPUTE" }), "Dispute resolved. Resume automation when ready.")}>Resolve dispute</button>}
                  <button className={`${s.btn} ${s.btnDanger}`} disabled={!!busy}
                    onClick={() => confirmAction("Close this case?") && run("close", () => action({ action: "CLOSE" }), "Case closed.")}>
                    Close case
                  </button>
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="payamt">Amount received (₹, blank = full balance)</label>
                  <input id="payamt" type="number" min={0} step="0.01" className={s.input} style={{ width: 190 }} value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="promise">Debtor promised to pay on</label>
                  <div className={s.btnRow}>
                    <input id="promise" type="date" className={s.input} style={{ width: 190 }} value={promise} onChange={(e) => setPromise(e.target.value)} />
                    <button className={s.btn} disabled={!promise || !!busy}
                      onClick={() => run("prom", () => action({ action: "RECORD_PROMISE", promised_date: promise }), "Promise recorded.")}>
                      Record promise
                    </button>
                  </div>
                </div>
              </div>
            ) : <p className={s.muted}>No actions available for a {ct.label.toLowerCase()} case.</p>}
          </div>
        </div>

        <div className={s.stack}>
          <div className={`${s.card} ${s.cardPad}`}>
            <div className={s.cardTitle}>
              Call history
              <button className={`${s.btn} ${s.btnSm}`} onClick={() => void sync()}>Refresh status</button>
            </div>
            {d.attempts.length === 0 ? <p className={s.muted}>No calls yet.</p> : (
              <div className={s.stack}>
                {d.attempts.map((x) => <AttemptCard key={x.id} a={x} />)}
              </div>
            )}
          </div>

          <div className={`${s.card} ${s.cardPad}`}>
            <div className={s.cardTitle}>Payments</div>
            {d.payments.length === 0 ? <p className={s.muted}>No payments recorded.</p> : (
              <ul className={s.stack} style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {d.payments.map((p) => (
                  <li key={p.id} className={s.small}><span className={s.strong}>{inr(p.amount_paise)}</span> <span className={s.muted}>· {fmtDateTime(p.created_at)} · {p.source === "USER" ? "You" : p.source === "INVOICE_SYNC" ? "Invoice sync" : "Payment event"}</span></li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${s.card} ${s.cardPad}`}>
            <div className={s.cardTitle}>Timeline</div>
            <ol className={s.timeline}>
              {d.events.map((e) => (
                <li key={e.id}>
                  <span className={e.actor_type === "USER" ? s.dot : `${s.dot} ${s.dotSys}`} aria-hidden />
                  <div>
                    <div className={s.strong}>{eventText(e.event_type)}</div>
                    <div className={`${s.small} ${s.muted}`}>
                      {fmtDateTime(e.occurred_at)} · {e.actor_type === "USER" ? "You" : e.actor_type === "PROVIDER" ? "Provider" : "System"}
                      {typeof e.metadata?.reason === "string" ? ` · ${String(e.metadata.reason).replace(/_/g, " ").toLowerCase()}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function AttemptCard({ a }: { a: Attempt }) {
  const t = attemptTone(a.status);
  const failed = a.status === "FAILED";
  const accepted = !!a.accepted_at;
  const ended = !!a.completed_at;
  const simulated = a.provider === "MOCK";
  return (
    <div className={s.attempt}>
      <div className={s.attemptHead}>
        <span><span className={s.strong}>{a.trigger === "MANUAL" ? "Manual call" : "Scheduled call"}</span>{" "}<span className={`${s.small} ${s.muted}`}>{fmtDateTime(a.created_at)}</span></span>
        <span className={s.btnRow}>
          {simulated && <Chip tone="Neutral">Simulated</Chip>}
          <Chip tone={t.tone}>{t.label}</Chip>
        </span>
      </div>
      <div className={s.steps}>
        <div className={`${s.step} ${accepted ? s.stepDone : failed && !accepted ? s.stepFail : ""}`}>
          <div className={s.stepName}>Request accepted</div>
          <div className={s.stepTime}>{accepted ? fmtDateTime(a.accepted_at) : failed ? "Not accepted" : "Pending"}</div>
        </div>
        <div className={`${s.step} ${a.answered_at ? s.stepDone : ""}`}>
          <div className={s.stepName}>Recipient answered</div>
          <div className={s.stepTime}>{a.answered_at ? fmtDateTime(a.answered_at) : ended ? "No" : "-"}</div>
        </div>
        <div className={`${s.step} ${a.status === "COMPLETED" ? s.stepDone : failed && ended ? s.stepFail : ""}`}>
          <div className={s.stepName}>{a.status === "COMPLETED" ? "Call completed" : "Call ended"}</div>
          <div className={s.stepTime}>{ended ? `${fmtDateTime(a.completed_at)}${a.duration_seconds ? ` · ${a.duration_seconds}s` : ""}${a.status === "NO_ANSWER" ? " · no answer" : a.status === "BUSY" ? " · busy" : ""}` : "-"}</div>
        </div>
      </div>
      {failureText(a.failure_reason) && <div className={`${s.small} ${failed ? s.fieldError : s.muted}`}>{failureText(a.failure_reason)}</div>}
      {simulated && <div className={s.hint}>Simulated: no real call was placed.</div>}
    </div>
  );
}
