import "server-only";
import type { CibilData, CompanyData, CreditRatingData, DirectorData, GstSearchData, TurnoverData } from "@/lib/checks";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInrShort } from "@/lib/money";
import type { ReportView } from "./service";

// The credit report as a branded printable page (FR-RPT-04): report number, generation time, sections with their
// sources and times, and the disclaimer. "Download PDF" opens it and the browser saves it as PDF, like invoices.
// A stored PDF/A arrives with the PDF engine later (build plan T5).

type T = (key: string, values?: Record<string, string | number>) => string;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const short = (p: number) => formatInrShort(BigInt(Math.round(p)));
const day = (iso: string) => formatDate(iso.length > 10 ? istDate(new Date(iso)) : iso);

function rows(r: [string, string][]) {
  return `<table class="kv">${r.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("")}</table>`;
}

export function reportHtml(report: ReportView, t: T): string {
  const o = report.outcome;
  const item = (code: string) => report.items.find((i) => i.code === code);
  const data = <X,>(code: string) => (item(code)?.status === "success" && item(code)!.data ? (item(code)!.data as X) : null);
  const stateKeyOf = (i: ReportView["items"][number]) =>
    i.hidden ? (i.hidden === "withdrawn" ? "hidden_withdrawn" : "hidden_lapsed")
    : i.status === "cancelled" && i.errorCode === "CONSENT_DECLINED" ? "consent_declined"
    : i.status === "cancelled" && i.errorCode === "CONSENT_EXPIRED" ? "consent_expired"
    : i.status === "cancelled" && i.errorCode === "CONSENT_WITHDRAWN" ? "consent_withdrawn"
    : i.status;
  const stateOf = (codes: string[]) => {
    const found = codes.map(item).filter(Boolean);
    if (!found.length) return `<p class="muted">${esc(t("state.not_selected"))}</p>`;
    return found
      .filter((i) => i!.status !== "success" || i!.hidden)
      .map((i) => `<p class="muted">${found.length > 1 ? `${esc(i!.name)}: ` : ""}${esc(t(`state.${stateKeyOf(i!)}`))}</p>`)
      .join("");
  };
  const source = (codes: string[]) => {
    const i = codes.map(item).find((x) => x?.status === "success" && !x.hidden);
    return i?.fetchedAt ? `<span class="src">${esc(t("source", { provider: i.provider?.startsWith("mock") ? t("testData") : i.provider ?? "", time: formatDateTimeIst(new Date(i.fetchedAt)) }))}</span>` : "";
  };
  const section = (title: string, codes: string[], body: string) =>
    `<section><h3>${esc(title)} ${source(codes)}</h3>${stateOf(codes)}${body}</section>`;

  const gst = data<GstSearchData>("CW_GST_SEARCH");
  const company = data<CompanyData>("CW_COMPANY");
  const directors = data<DirectorData>("CW_DIRECTOR");
  const rating = data<CreditRatingData>("CW_CREDIT_RATING");
  const turnover = data<TurnoverData>("CW_GST_TURNOVER") ?? data<TurnoverData>("CW_GST_TURNOVER_CY");
  const cibil = [data<CibilData>("CW_CIBIL_COMPANY"), data<CibilData>("CW_CIBIL_PERSONAL")].filter(Boolean) as CibilData[];

  const range = o.range
    ? `<p class="big">${esc(t("rangeValue", { low: short(o.range.lowPaise), high: short(o.range.highPaise) }))}</p>
       <p class="muted">${esc(t("rangeBasis", { low: o.range.reduced ? 0.5 : 1, high: o.range.reduced ? 1 : 2, base: short(o.range.basePaise), year: o.range.baseYear }))}</p>`
    : `<p>${esc(o.rangeNote ? t(`rangeNote.${o.rangeNote}`) : "—")}</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(report.reportNo)} · ${esc(report.counterparty.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f5f7; color: #0f172a; font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 860px; margin: 24px auto; background: #fff; padding: 36px 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); position: relative; }
  .brand { font-weight: 800; font-size: 16px; } .brand span { color: #fc8019; }
  h1 { font-size: 22px; margin: 8px 0 2px; } h3 { font-size: 14px; margin: 0 0 8px; display: flex; justify-content: space-between; gap: 8px; }
  .muted { color: #64748b; } .src { font-weight: 400; font-size: 11px; color: #64748b; }
  .test { display: inline-block; background: #fffbeb; color: #b45309; border-radius: 999px; padding: 2px 10px; font-weight: 700; font-size: 11px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .big { font-size: 22px; font-weight: 800; margin: 6px 0 2px; }
  .high { background: #fff1f2; border-color: #fecdd3; } .medium { background: #fffbeb; border-color: #fde68a; } .low { background: #ecfdf5; border-color: #a7f3d0; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  section { border-top: 1px solid #e2e8f0; padding: 14px 0; break-inside: avoid; }
  table.kv { width: 100%; border-collapse: collapse; } .kv th { text-align: left; font-weight: 500; color: #64748b; padding: 3px 0; width: 45%; } .kv td { text-align: right; padding: 3px 0; }
  .bars { display: flex; gap: 10px; align-items: flex-end; height: 120px; } .bar { flex: 1; text-align: center; font-size: 11px; } .bar div { background: #fc8019; border-radius: 4px 4px 0 0; }
  .disclaimer { margin-top: 18px; font-size: 11px; color: #64748b; }
  .watermark { position: absolute; top: 40%; left: 0; right: 0; text-align: center; font-size: 80px; font-weight: 800; color: rgba(225,29,72,.12); transform: rotate(-20deg); pointer-events: none; }
  .actions { max-width: 860px; margin: 0 auto; text-align: right; }
  button { font: inherit; font-weight: 700; background: #fc8019; color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; cursor: pointer; margin-top: 12px; }
  @media (max-width: 640px) { main { padding: 20px; margin: 0; border-radius: 0; } .cards { grid-template-columns: 1fr; } }
  @media print { body { background: #fff; } main { box-shadow: none; margin: 0; max-width: none; } .actions { display: none; } }
</style>
</head>
<body>
<div class="actions"><button type="button" onclick="window.print()">Save as PDF</button></div>
<main>
  ${report.expired ? `<div class="watermark">Expired</div>` : ""}
  <div class="brand">Chaan<span>Bean</span></div>
  <p class="muted">${esc(t("title"))} · ${esc(t("meta", { number: report.reportNo, date: formatDateTimeIst(new Date(report.createdAt)), valid: day(report.validUntil) }))}</p>
  <h1>${esc(report.counterparty.name)}</h1>
  ${report.counterparty.gstin ? `<p class="muted">GSTIN ${esc(report.counterparty.gstin)}</p>` : ""}
  ${report.testData ? `<span class="test">${esc(t("testData"))}</span>` : ""}
  <div class="cards">
    <div class="card ${o.level === "not_enough_data" ? "" : esc(o.level)}"><div class="label">${esc(t("riskTitle"))}</div><p class="big">${esc(t(`risk.${o.level}`))}</p><p class="muted">${esc(t("riskCounts", { good: o.counts.positive, warn: o.counts.caution + o.counts.red }))}</p></div>
    <div class="card"><div class="label">${esc(t("rangeTitle"))} (${esc(t("rangeGuide"))})</div>${range}</div>
    <div class="card"><div class="label">${esc(t("whyTitle"))}</div>${o.signals.length ? `<ul>${o.signals.map((s) => `<li>${esc(t(`signal.${s.key}`, s.values ?? {}))}</li>`).join("")}</ul>` : `<p class="muted">${esc(t("noSignals"))}</p>`}</div>
  </div>
  ${section(t("sectionGst"), ["CW_GST_SEARCH"], gst ? rows([
    [t("status"), esc(gst.status)], [t("registered"), esc(day(gst.registrationDate))], [t("type"), esc(gst.constitution)],
    [t("gstinsOnPan"), String(gst.gstinsOnPan.length)], [t("lastReturn"), esc(gst.lastReturnPeriod ?? "—")],
    [t("onTime"), esc(t("onTimeValue", { ok: gst.filings.filter((f) => f.filed && f.onTime).length, total: gst.filings.length }))],
  ]) : "")}
  ${section(t("sectionTurnover"), ["CW_GST_TURNOVER", "CW_GST_TURNOVER_CY"], turnover ? `<div class="bars">${turnover.years.map((y) => {
    const max = Math.max(1, ...turnover.years.map((x) => x.turnoverPaise));
    return `<div class="bar"><strong>${esc(short(y.turnoverPaise))}</strong><div style="height:${Math.max(4, (y.turnoverPaise / max) * 80)}px"></div>${esc(y.partial ? t("partialYear", { fy: y.fy }) : y.fy)}</div>`;
  }).join("")}</div>` : "")}
  ${section(t("sectionCibil"), ["CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL"], cibil.map((c) => rows([
    [t("cibilRank"), esc(`${c.bureau} ${c.scoreOrRank}`)], [t("activeLoans"), String(c.activeLoans)], [t("outstanding"), esc(short(c.outstandingPaise))],
    [t("overdueLoans"), c.overdue.length ? esc(t("overdueValue", { count: c.overdue.length, days: Math.max(...c.overdue.map((x) => x.daysPastDue)) })) : esc(t("noneOverdue"))],
    [t("enquiries"), String(c.enquiries6m)],
  ])).join(""))}
  ${section(t("sectionCompany"), ["CW_COMPANY", "CW_DIRECTOR"], `${company ? rows([
    [t("status"), esc(company.status)], [t("cin"), esc(company.cin)], [t("incorporated"), esc(day(company.incorporationDate))],
    [t("capital"), esc(short(company.paidUpCapitalPaise))],
  ]) : ""}${directors ? `<p><strong>${esc(t("directors"))}</strong></p><ul>${directors.directors.map((d) => `<li>${esc(d.name)}, ${esc(d.designation)}, DIN ${esc(d.din)}${d.disqualified ? ` (${esc(t("disqualified"))})` : ""}</li>`).join("")}</ul>` : ""}`)}
  ${section(t("sectionRating"), ["CW_CREDIT_RATING"], rating ? (rating.ratings.length ? `<ul>${rating.ratings.map((r) => `<li>${esc(r.agency)}: ${esc(r.rating)} (${esc(r.outlook)}), ${esc(day(r.date))}</li>`).join("")}</ul>` : `<p class="muted">${esc(t("notRated"))}</p>`) : "")}
  <p class="disclaimer">Guidance only. The risk level and safe credit range are worked out from the data above by fixed rules and do not replace your own judgement. Data comes from the sources named in each section at the times shown. This report is valid for 30 days from the date it was generated. Data shared by the buyer with their consent is used only for the purpose they agreed to.</p>
</main>
</body>
</html>`;
}
