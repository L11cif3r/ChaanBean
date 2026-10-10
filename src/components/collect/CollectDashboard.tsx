"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import s from "./collect.module.css";
import { ApiError, api, automationTone, caseTone, fmtDate, fmtDateTime, inr, attemptTone } from "./client";
import { Chip, ProviderBanner, Toast } from "./ui";

interface Row {
  id: string; debtor_name: string; phone_last4: string; amount_due_paise: number; due_date: string; days_overdue: number;
  status: string; promised_pay_date: string | null;
  automation: null | { state: string; frequency: string; next_call_at: string | null; max_attempts: number; attempt_count: number; stop_reason: string | null };
  last_attempt: null | { status: string; created_at: string };
}
interface ListResp { cases: Row[]; provider: { name: string; ready: boolean; reason?: string } }

const todayIso = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export default function CollectDashboard() {
  const router = useRouter();
  const [data, setData] = useState<ListResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<ListResp>("/api/collect/cases"));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load cases.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const rows = data?.cases ?? [];
    const open = rows.filter((r) => r.status === "ACTIVE" || r.status === "DISPUTED");
    return {
      total: rows.length,
      outstanding: open.reduce((n, r) => n + r.amount_due_paise, 0),
      running: rows.filter((r) => r.automation?.state === "ACTIVE").length,
      paid: rows.filter((r) => r.status === "PAID").length,
    };
  }, [data]);

  return (
    <div className={s.root}>
      <div className={s.pageHead}>
        <div>
          <h1 className={s.title}>Collect</h1>
          <p className={s.sub}>Automated payment reminder calls for overdue invoices. Calls stop the moment a payment, dispute or pause is recorded.</p>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
          {showForm ? "Close" : "+ New collection case"}
        </button>
      </div>

      <ProviderBanner provider={data?.provider ?? null} />
      {error && <div className={`${s.banner} ${s.bannerErr}`} role="alert">{error}</div>}

      <div className={s.stats}>
        <div className={s.stat}><div className={s.statLabel}>Outstanding</div><div className={s.statValue}>{inr(stats.outstanding)}</div></div>
        <div className={s.stat}><div className={s.statLabel}>Cases</div><div className={s.statValue}>{stats.total}</div></div>
        <div className={s.stat}><div className={s.statLabel}>Automations running</div><div className={s.statValue}>{stats.running}</div></div>
        <div className={s.stat}><div className={s.statLabel}>Paid</div><div className={s.statValue}>{stats.paid}</div></div>
      </div>

      {showForm && (
        <NewCase
          onCancel={() => setShowForm(false)}
          onCreated={(id) => { setToast({ kind: "ok", message: "Case created." }); router.push(`/collect/${id}`); }}
        />
      )}

      <div className={s.card}>
        {!data && !error && <div className={s.empty}>Loading cases...</div>}
        {data && data.cases.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyTitle}>No collection cases yet</div>
            Add an overdue invoice to start automated reminders.
          </div>
        )}
        {data && data.cases.length > 0 && (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Debtor</th><th className={s.num}>Amount due</th><th>Due</th><th>Case</th><th>Automation</th><th>Next call</th><th>Last call</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((r) => {
                  const c = caseTone(r.status);
                  const a = automationTone(r.automation);
                  const l = r.last_attempt ? attemptTone(r.last_attempt.status) : null;
                  return (
                    <tr key={r.id} className={s.rowLink} onClick={() => router.push(`/collect/${r.id}`)}>
                      <td>
                        <Link href={`/collect/${r.id}`} className={s.strong} onClick={(e) => e.stopPropagation()}>{r.debtor_name}</Link>
                        <div className={`${s.small} ${s.muted} ${s.mono}`}>+91 ••••• ••{r.phone_last4}</div>
                      </td>
                      <td className={`${s.num} ${s.strong}`}>{inr(r.amount_due_paise)}</td>
                      <td>
                        {fmtDate(r.due_date)}
                        {r.days_overdue > 0 && r.status === "ACTIVE" && <div className={`${s.small} ${s.muted}`}>{r.days_overdue} days overdue</div>}
                      </td>
                      <td><Chip tone={c.tone}>{c.label}</Chip></td>
                      <td>
                        <Chip tone={a.tone}>{a.label}</Chip>
                        {r.automation && <div className={`${s.small} ${s.muted}`}>{r.automation.attempt_count}/{r.automation.max_attempts} attempts</div>}
                      </td>
                      <td className={s.small}>{r.automation?.state === "ACTIVE" ? fmtDateTime(r.automation.next_call_at) : "-"}</td>
                      <td>{l ? <Chip tone={l.tone}>{l.label}</Chip> : <span className={s.muted}>-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      {children}
      {error && <span className={s.fieldError} role="alert">{error}</span>}
    </div>
  );
}

function NewCase({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ debtor_name: "", debtor_phone: "", amount: "", due_date: todayIso(), language: "en", invoice_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const rupees = Number(f.amount);
    if (!f.debtor_name.trim()) errs.debtor_name = "Enter the debtor's name.";
    if (!/^(\+?91)?[\s-]?0?[6-9]\d{4}[\s-]?\d{5}$/.test(f.debtor_phone.trim())) errs.debtor_phone = "Enter a valid 10-digit mobile number.";
    if (!Number.isFinite(rupees) || rupees <= 0) errs.amount = "Enter an amount greater than zero.";
    if (!f.due_date) errs.due_date = "Pick the invoice due date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFormError(null);
    try {
      const r = await api<{ case: { id: string } }>("/api/collect/cases", {
        method: "POST",
        body: JSON.stringify({
          debtor_name: f.debtor_name, debtor_phone: f.debtor_phone, amount_due_paise: Math.round(rupees * 100),
          due_date: f.due_date, language: f.language, ...(f.invoice_id.trim() ? { invoice_id: f.invoice_id.trim() } : {}),
        }),
      });
      onCreated(r.case.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't create the case.");
      setBusy(false);
    }
  }

  return (
    <form className={`${s.card} ${s.cardPad}`} style={{ marginBottom: 18 }} onSubmit={submit} noValidate>
      <div className={s.cardTitle}>New collection case</div>
      <div className={s.form}>
        <Field id="nc-name" label="Debtor name" error={errors.debtor_name}>
          <input id="nc-name" className={s.input} value={f.debtor_name} onChange={set("debtor_name")} autoFocus />
        </Field>
        <Field id="nc-phone" label="Mobile number" error={errors.debtor_phone}>
          <input id="nc-phone" className={s.input} inputMode="tel" placeholder="98765 43210" value={f.debtor_phone} onChange={set("debtor_phone")} />
        </Field>
        <Field id="nc-amount" label="Amount due (₹)" error={errors.amount}>
          <input id="nc-amount" className={s.input} inputMode="decimal" value={f.amount} onChange={set("amount")} />
        </Field>
        <Field id="nc-due" label="Invoice due date" error={errors.due_date}>
          <input id="nc-due" type="date" className={s.input} value={f.due_date} onChange={set("due_date")} />
        </Field>
        <Field id="nc-lang" label="Call language">
          <select id="nc-lang" className={s.input} value={f.language} onChange={set("language")}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </Field>
        <Field id="nc-inv" label="Invoice reference (optional)">
          <input id="nc-inv" className={s.input} value={f.invoice_id} onChange={set("invoice_id")} />
        </Field>
        {formError && <div className={`${s.banner} ${s.bannerErr}`} style={{ gridColumn: "1 / -1", margin: 0 }} role="alert">{formError}</div>}
        <div className={s.formFoot}>
          <button type="button" className={s.btn} onClick={onCancel}>Cancel</button>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={busy}>{busy ? "Creating..." : "Create case"}</button>
        </div>
      </div>
    </form>
  );
}
