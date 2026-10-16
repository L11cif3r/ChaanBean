import "server-only";
import { formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { InvoiceRow } from "./service";

// GST invoice as a printable page (FR-BIL-06). "Download" opens it and the browser saves it as PDF. A stored PDF
// arrives with the PDF engine in Part 5; the numbers here are the stored invoice row and never recalculated.

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const money = (p: bigint) => formatInr(p, { withPaise: true });

function address(a: unknown): string {
  if (!a) return "";
  if (typeof a === "string") return a;
  if (typeof a === "object") {
    const o = a as Record<string, unknown>;
    return [o.line1, o.line2, o.city, o.district, o.state, o.pincode ?? o.pin].filter(Boolean).join(", ");
  }
  return "";
}

export function invoiceHtml(inv: InvoiceRow): string {
  const intra = inv.igstPaise === 0n;
  const draft = !inv.supplier.gstin;
  const taxRows = intra
    ? `<tr><td>CGST 9%</td><td class="num">${money(inv.cgstPaise)}</td></tr><tr><td>SGST 9%</td><td class="num">${money(inv.sgstPaise)}</td></tr>`
    : `<tr><td>IGST 18%</td><td class="num">${money(inv.igstPaise)}</td></tr>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(inv.number)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f5f7; color: #0f172a; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 820px; margin: 24px auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #64748b; }
  .draft { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; padding: 8px 12px; border-radius: 8px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  .label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .totals { width: 320px; margin-left: auto; margin-top: 16px; }
  .totals tr:last-child td { font-weight: 800; font-size: 16px; border-bottom: 0; }
  .actions { max-width: 820px; margin: 0 auto; text-align: right; }
  button { font: inherit; font-weight: 700; background: #fc8019; color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; cursor: pointer; }
  @media (max-width: 600px) { main { padding: 20px; margin: 0; border-radius: 0; } .grid { grid-template-columns: 1fr; } .totals { width: 100%; } }
  @media print { body { background: #fff; } main { box-shadow: none; margin: 0; max-width: none; } .actions { display: none; } }
</style>
</head>
<body>
<div class="actions"><button type="button" onclick="window.print()">Save as PDF</button></div>
<main>
  ${draft ? `<p class="draft">Draft: Chaanbean's billing entity and GSTIN are not set yet (PRD Q12). Not valid as a tax invoice.</p>` : ""}
  <h1>Tax invoice</h1>
  <p class="muted">${esc(inv.number)} · ${esc(formatDateTimeIst(inv.issuedAt))}</p>
  <div class="grid">
    <section>
      <div class="label">From</div>
      <strong>${esc(inv.supplier.legal_name)}</strong><br>
      ${inv.supplier.gstin ? `GSTIN ${esc(inv.supplier.gstin)}<br>` : ""}
      ${esc(inv.supplier.address)}<br>
      State code ${esc(inv.supplier.state_code)}
    </section>
    <section>
      <div class="label">Bill to</div>
      <strong>${esc(inv.customer.legal_name)}</strong><br>
      ${inv.customer.trade_name ? `${esc(inv.customer.trade_name)}<br>` : ""}
      ${inv.customer.gstin ? `GSTIN ${esc(inv.customer.gstin)}<br>` : "Unregistered<br>"}
      ${esc(address(inv.customer.address))}${address(inv.customer.address) ? "<br>" : ""}
      Place of supply: state code ${esc(inv.placeOfSupply)}
    </section>
  </div>
  <table>
    <thead><tr><th>Description</th><th>SAC</th><th class="num">Taxable value</th></tr></thead>
    <tbody><tr><td>${esc(inv.description)}</td><td>${esc(inv.sac)}</td><td class="num">${money(inv.taxablePaise)}</td></tr></tbody>
  </table>
  <table class="totals">
    <tr><td>Taxable value</td><td class="num">${money(inv.taxablePaise)}</td></tr>
    ${taxRows}
    <tr><td>Total</td><td class="num">${money(inv.totalPaise)}</td></tr>
  </table>
</main>
</body>
</html>`;
}
