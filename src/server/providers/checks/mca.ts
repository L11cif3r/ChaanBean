import "server-only";
import type { CompanyData } from "@/lib/checks";
import { saveMcaRecords } from "@/server/companies/mca-import";
import { sql } from "@/server/db/sql";
import { lookupCinLive, mcaKey } from "@/server/providers/mca";
import type { CheckProvider } from "./index";

// Company check (CW_COMPANY, ₹2) from MCA open data (PRD v4.0 section 13: "Source now: MCA open data, Have").
// Our copy of the master data first, then data.gov.in by CIN. The open data has status, class, category, capital,
// registration date and office, but no AGM, balance sheet or charge details: those stay empty (a paid MCA source,
// such as Probe42, adds them). Switch on with PROVIDER_CW_COMPANY=mca (or mca,probe42 to fall back).

const now = () => new Date().toISOString();

type Row = { cin: string; name: string; status: string | null; class: string | null; category: string | null; registration_date: Date | null;
  authorised_capital_paise: string | null; paidup_capital_paise: string | null; address: string | null; dataset_date: Date;
  sub_category: string | null; listing_status: string | null; origin: string | null; activity: string | null; nic_code: string | null; roc: string | null };

async function find(cin: string): Promise<Row | null> {
  const q = () => sql()<Row[]>`
    select cin, name, status, class, category, registration_date, authorised_capital_paise, paidup_capital_paise, address, dataset_date,
           sub_category, listing_status, origin, activity, nic_code, roc
      from public.mca_companies where cin = ${cin}`;
  const [local] = await q();
  if (local) return local;
  const live = await lookupCinLive(cin);
  if (!live.record) return null;
  await saveMcaRecords([live.record], live.datasetDate);
  return (await q())[0] ?? null;
}

export const mcaCheckProvider: CheckProvider = {
  name: "mca",
  isMock: false,
  async run(code, subject) {
    if (code !== "CW_COMPANY") {
      return { status: "not_available", provider: "mca", fetchedAt: now(), error: { code: "NOT_OFFERED", message: "MCA open data covers the Company check only.", retryable: true }, raw: null };
    }
    if (!subject.cin) {
      return { status: "not_available", provider: "mca", fetchedAt: now(), error: { code: "NEEDS_CIN", message: "Company records need the CIN or LLPIN.", retryable: false }, raw: null };
    }
    if (!mcaKey()) {
      const [has] = await sql()`select 1 from public.mca_companies where cin = ${subject.cin}`;
      if (!has) return { status: "not_available", provider: "mca", fetchedAt: now(), error: { code: "NO_KEY", message: "DATA_GOV_IN_API_KEY is not set.", retryable: true }, raw: null };
    }
    let row: Row | null;
    try {
      row = await find(subject.cin);
    } catch (e) {
      return { status: "not_available", provider: "mca", fetchedAt: now(), error: { code: "NETWORK", message: (e as Error).message.slice(0, 200), retryable: true }, raw: null };
    }
    if (!row) return { status: "no_data", provider: "mca", fetchedAt: now(), raw: { cin: subject.cin } };
    const data: CompanyData = {
      cin: row.cin,
      name: row.name,
      status: row.status ?? "Unknown",
      incorporationDate: row.registration_date ? row.registration_date.toISOString().slice(0, 10) : "",
      companyClass: row.class ?? (/^[A-Z]{3}-\d{4}$/.test(row.cin) ? "LLP" : ""),
      category: row.category ?? "",
      authorisedCapitalPaise: Number(row.authorised_capital_paise ?? 0),
      paidUpCapitalPaise: Number(row.paidup_capital_paise ?? 0),
      registeredOffice: row.address ?? "",
      lastAgmDate: null,
      lastBalanceSheetDate: null,
      charges: [],
      chargesKnown: false,
      datasetDate: row.dataset_date.toISOString().slice(0, 10),
      subCategory: row.sub_category, listing: row.listing_status, origin: row.origin, activity: row.activity, nicCode: row.nic_code,
      registrar: row.roc,
    };
    return { status: "success", provider: "mca", fetchedAt: now(), data, raw: { source: "data.gov.in", datasetDate: row.dataset_date.toISOString().slice(0, 10) } };
  },
};
