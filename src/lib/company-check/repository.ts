// Normalisers: provider canonical objects → shared company tables (PRD §8.2 step 7).
// Every row keeps source + fetched_at. Nothing is guessed or defaulted.

import type { Prisma, PrismaClient } from "@prisma/client";
import { encryptPan as encryptPanBuffer, panHash } from "./pan-crypto";

const encryptPan = (pan: string) => {
  const b = encryptPanBuffer(pan);
  return b ? new Uint8Array(b) : null;
};
import type {
  ChargeRecord, CompanyMaster, DirectorRecord, EntityType, FinancialRecord, GstFilingRecord, GstTaxpayer,
} from "./providers/types";

type Db = PrismaClient | Prisma.TransactionClient;
const json = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));
const date = (s?: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

export function entityTypeFromConstitution(constitution?: string): EntityType {
  const c = (constitution ?? "").toLowerCase();
  if (c.includes("private limited")) return "PRIVATE_LTD";
  if (c.includes("public limited")) return "PUBLIC_LTD";
  if (c.includes("one person")) return "OPC";
  if (c.includes("limited liability")) return "LLP";
  if (c.includes("proprietor")) return "PROPRIETORSHIP";
  if (c.includes("partnership")) return "PARTNERSHIP";
  if (c.includes("hindu undivided")) return "HUF";
  if (c.includes("trust") || c.includes("society")) return "TRUST";
  return "OTHER";
}

export async function upsertCompanyFromMaster(db: Db, m: CompanyMaster, fetchedAt: Date, isTest: boolean): Promise<string> {
  const data = {
    is_test: isTest,
    entity_type: m.entityType,
    legal_name: m.legalName,
    cin: m.cin ?? null,
    llpin: m.llpin ?? null,
    company_status: m.companyStatus as never,
    company_class: m.companyClass ?? null,
    category: m.category ?? null,
    sub_category: m.subCategory ?? null,
    roc_code: m.rocCode ?? null,
    incorporation_date: date(m.incorporationDate),
    authorised_capital_paise: m.authorisedCapitalPaise ?? null,
    paid_up_capital_paise: m.paidUpCapitalPaise ?? null,
    listing_status: m.listingStatus ?? null,
    registered_address: json(m.registeredAddress),
    registered_email: m.registeredEmail ?? null,
    last_agm_date: date(m.lastAgmDate),
    last_balance_sheet_date: date(m.lastBalanceSheetDate),
    mca_synced_at: fetchedAt,
    updated_at: fetchedAt,
    ...(m.pan ? { pan_hash: panHash(m.pan), pan_enc: encryptPan(m.pan) } : {}),
  };
  const existing = await db.companies.findFirst({
    where: m.cin ? { cin: m.cin } : { llpin: m.llpin },
    select: { id: true },
  });
  if (existing) {
    await db.companies.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await db.companies.create({ data, select: { id: true } });
  return created.id;
}

/** For GST-only businesses (proprietorships, partnerships) that have no MCA record. */
export async function upsertCompanyFromTaxpayer(db: Db, t: GstTaxpayer, fetchedAt: Date, isTest: boolean): Promise<string> {
  const reg = await db.company_gst_registrations.findUnique({ where: { gstin: t.gstin }, select: { company_id: true } });
  if (reg) return reg.company_id;
  const pan = t.gstin.slice(2, 12);
  const byPan = await db.companies.findUnique({ where: { pan_hash: panHash(pan) }, select: { id: true } });
  if (byPan) return byPan.id;
  const created = await db.companies.create({
    data: {
      is_test: isTest,
      entity_type: entityTypeFromConstitution(t.constitution),
      legal_name: t.legalName ?? t.tradeName ?? t.gstin,
      trade_name: t.tradeName ?? null,
      pan_hash: panHash(pan),
      pan_enc: encryptPan(pan),
      state_code: t.gstin.slice(0, 2),
      incorporation_date: date(t.registrationDate),
      gst_synced_at: fetchedAt,
    },
    select: { id: true },
  });
  return created.id;
}

export async function upsertGstRegistration(db: Db, companyId: string, t: GstTaxpayer, source: string, fetchedAt: Date) {
  const data = {
    company_id: companyId,
    legal_name: t.legalName ?? null,
    trade_name: t.tradeName ?? null,
    gst_status: t.status,
    registration_date: date(t.registrationDate),
    cancellation_date: date(t.cancellationDate),
    constitution: t.constitution ?? null,
    taxpayer_type: t.taxpayerType ?? null,
    principal_address: json(t.principalAddress),
    additional_places: json(t.additionalPlaces),
    state_code: t.gstin.slice(0, 2),
    nature_of_business: t.natureOfBusiness ?? [],
    turnover_slab: t.turnoverSlab ?? null,
    turnover_slab_fy: t.turnoverSlabFy ?? null,
    einvoice_enabled: t.einvoiceEnabled ?? null,
    source,
    fetched_at: fetchedAt,
  };
  const row = await db.company_gst_registrations.upsert({
    where: { gstin: t.gstin },
    create: { gstin: t.gstin, ...data },
    update: data,
    select: { id: true },
  });
  if (t.tradeName) await db.companies.update({ where: { id: companyId }, data: { trade_name: t.tradeName } });
  await replaceContacts(db, companyId, `${source}:gst:${t.gstin}`, fetchedAt, [
    ...(t.principalAddress ? [{ type: "ADDRESS" as const, label: `Principal place of business (${t.gstin})`, value: t.principalAddress }] : []),
    ...(t.additionalPlaces ?? []).map((a) => ({ type: "ADDRESS" as const, label: `Additional place (${t.gstin})`, value: a })),
  ]);
  await db.companies.update({ where: { id: companyId }, data: { gst_synced_at: fetchedAt } });
  return row.id;
}

export async function replaceGstFilings(db: Db, registrationId: string, rows: GstFilingRecord[], source: string, fetchedAt: Date) {
  if (rows.length === 0) return;
  // Two round trips instead of one per return: delete the periods received, insert them fresh.
  await db.gst_return_filings.deleteMany({
    where: { gst_registration_id: registrationId, OR: rows.map((f) => ({ return_type: f.returnType, tax_period: f.taxPeriod })) },
  });
  await db.gst_return_filings.createMany({
    data: rows.map((f) => ({
      gst_registration_id: registrationId,
      return_type: f.returnType,
      tax_period: f.taxPeriod,
      fiscal_year: f.fiscalYear ?? null,
      due_date: date(f.dueDate),
      filed_on: date(f.filedOn),
      filing_status: (f.filedOn ? "FILED" : "NOT_FILED") as "FILED" | "NOT_FILED",
      source,
      fetched_at: fetchedAt,
    })),
  });
}

export async function replaceFinancials(db: Db, companyId: string, rows: FinancialRecord[], source: string, fetchedAt: Date) {
  if (rows.length > 0) {
    await db.company_financials.deleteMany({
      where: { company_id: companyId, OR: rows.map((f) => ({ fiscal_year: f.fiscalYear, statement_type: f.statementType })) },
    });
    await db.company_financials.createMany({
      data: rows.map((f) => ({
        company_id: companyId,
        fiscal_year: f.fiscalYear,
        statement_type: f.statementType,
        period_end: new Date(`${f.periodEnd}T00:00:00Z`),
        revenue_from_operations_paise: f.revenueFromOperationsPaise ?? null,
        other_income_paise: f.otherIncomePaise ?? null,
        total_income_paise: f.totalIncomePaise ?? null,
        profit_before_tax_paise: f.profitBeforeTaxPaise ?? null,
        profit_after_tax_paise: f.profitAfterTaxPaise ?? null,
        net_worth_paise: f.netWorthPaise ?? null,
        total_borrowings_paise: f.totalBorrowingsPaise ?? null,
        total_assets_paise: f.totalAssetsPaise ?? null,
        current_assets_paise: f.currentAssetsPaise ?? null,
        current_liabilities_paise: f.currentLiabilitiesPaise ?? null,
        filing_form: f.filingForm ?? null,
        filed_on: date(f.filedOn),
        verification_status: f.verificationStatus,
        source,
        fetched_at: fetchedAt,
      })),
    });
  }
  await db.companies.update({ where: { id: companyId }, data: { financials_synced_at: fetchedAt } });
}

export async function replaceDirectors(db: Db, companyId: string, rows: DirectorRecord[], source: string, fetchedAt: Date) {
  await db.company_directors.deleteMany({ where: { company_id: companyId } });
  if (rows.length === 0) return;
  await db.directors.createMany({
    data: rows.map((d) => ({ din: d.din, full_name: d.fullName, din_status: d.dinStatus ?? null, source, fetched_at: fetchedAt })),
    skipDuplicates: true,
  });
  const people = await db.directors.findMany({ where: { din: { in: rows.map((d) => d.din) } }, select: { id: true, din: true } });
  const idByDin = new Map(people.map((p) => [p.din, p.id]));
  await db.company_directors.createMany({
    data: rows.map((d) => ({
      company_id: companyId,
      director_id: idByDin.get(d.din)!,
      designation: d.designation ?? null,
      appointed_on: date(d.appointedOn),
      ceased_on: date(d.ceasedOn),
      is_signatory: d.isSignatory ?? null,
      source,
      fetched_at: fetchedAt,
    })),
  });
}

export async function replaceCharges(db: Db, companyId: string, rows: ChargeRecord[], source: string, fetchedAt: Date) {
  await db.company_charges.deleteMany({ where: { company_id: companyId } });
  if (rows.length === 0) return;
  await db.company_charges.createMany({
    data: rows.map((c) => ({
      company_id: companyId,
      charge_id: c.chargeId ?? null,
      charge_holder: c.chargeHolder ?? null,
      amount_paise: c.amountPaise ?? null,
      created_on: date(c.createdOn),
      modified_on: date(c.modifiedOn),
      satisfied_on: date(c.satisfiedOn),
      charge_status: c.status,
      source,
      fetched_at: fetchedAt,
    })),
  });
}

export async function replaceMcaContacts(db: Db, companyId: string, m: CompanyMaster, source: string, fetchedAt: Date) {
  await replaceContacts(db, companyId, `${source}:mca`, fetchedAt, [
    ...(m.registeredAddress ? [{ type: "ADDRESS" as const, label: "Registered office", value: m.registeredAddress }] : []),
    ...(m.registeredEmail ? [{ type: "EMAIL" as const, label: "Registered email", value: m.registeredEmail }] : []),
  ]);
}

async function replaceContacts(
  db: Db,
  companyId: string,
  source: string,
  fetchedAt: Date,
  rows: { type: "ADDRESS" | "EMAIL" | "PHONE" | "WEBSITE"; label: string; value: unknown }[],
) {
  await db.company_contacts.deleteMany({ where: { company_id: companyId, source } });
  if (rows.length === 0) return;
  await db.company_contacts.createMany({
    data: rows.map((r) => ({
      company_id: companyId,
      contact_type: r.type,
      label: r.label,
      value: r.value as Prisma.InputJsonValue,
      source,
      fetched_at: fetchedAt,
    })),
  });
}
