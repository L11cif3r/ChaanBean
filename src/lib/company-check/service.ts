// Company Check service (PRD §8). Routes call these functions; so do tests and the MCP tools.
// The organisation always comes from RequestContext (the verified session), never from input.

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assessCredit, type CreditEngineInput, type CreditPolicyParams } from "./credit-engine";
import { AppError, badRequest, forbidden, notFound, type RequestContext } from "./errors";
import { detectQuery, isValidGstin, panFromGstin } from "./identifiers";
import { panHash } from "./pan-crypto";
import { getProviders, providerMode, type CompanyCandidate, type ProviderResult } from "./providers";
import * as repo from "./repository";

type Section = "MCA_MASTER" | "DIRECTORS" | "GST_PROFILE" | "GST_FILINGS" | "FINANCIALS" | "CHARGES";
const SECTIONS: Section[] = ["MCA_MASTER", "DIRECTORS", "GST_PROFILE", "GST_FILINGS", "FINANCIALS", "CHARGES"];
const CORE_SECTIONS: Section[] = ["MCA_MASTER", "FINANCIALS", "GST_PROFILE"];
const ACTIVE_STATUSES = ["QUEUED", "FETCHING", "ASSESSING"] as const;
// Cache freshness (PRD §13.6), in days.
const FRESH_DAYS = { mca: 30, gst: 7, financials: 30 };

const isTestMode = () => providerMode() === "MOCK";

// Interactive transactions: the default 5 s limit is too short when the database is far away
// (each round trip to the current Supabase region is several hundred ms).
const TX_OPTS = { maxWait: 15_000, timeout: 30_000 };
const withTx = <T,>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn, TX_OPTS);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

async function audit(
  db: Prisma.TransactionClient | typeof prisma,
  ctx: Pick<RequestContext, "organisationId" | "userId" | "correlationId" | "ip" | "userAgent"> | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  await db.audit_events.create({
    data: {
      organisation_id: ctx?.organisationId ?? null,
      actor_type: ctx ? "USER" : "SYSTEM",
      actor_id: ctx?.userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      correlation_id: ctx?.correlationId ?? null,
      ip: ctx?.ip ?? null,
      user_agent: ctx?.userAgent ?? null,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function outbox(db: Prisma.TransactionClient | typeof prisma, eventType: string, organisationId: string | null, payload: Record<string, unknown>) {
  await db.outbox_events.create({
    data: { event_type: eventType, organisation_id: organisationId, payload: JSON.parse(JSON.stringify(payload, bigintReplacer)) },
  });
}
const bigintReplacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

// ======================================================================= access gates

export async function assertCanRunChecks(ctx: RequestContext) {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view checks but not run them.");
  const org = await prisma.organisations.findUnique({ where: { id: ctx.organisationId }, select: { kyc_status: true } });
  if (!org) throw notFound("Organisation");
  if (org.kyc_status !== "VERIFIED") throw forbidden("KYC_PENDING", "Complete business verification to run checks.");
  const sub = await prisma.subscriptions.findFirst({
    where: { organisation_id: ctx.organisationId, status: "ACTIVE", current_period_end: { gt: new Date() } },
    select: { id: true },
  });
  if (!sub) throw forbidden("SUBSCRIPTION_INACTIVE", "Activate a subscription to run checks.");
}

// ======================================================================= search (§14 #1)

export interface SearchCandidate {
  company_id: string | null;
  legal_name: string;
  trade_name: string | null;
  entity_type: string;
  cin: string | null;
  llpin: string | null;
  gstins: string[];
  state_code: string | null;
  status: string | null;
  incorporation_year: number | null;
  previous_check: { check_id: string; checked_at: string; free_reopen: boolean } | null;
}

export async function searchCompanies(ctx: RequestContext, rawQuery: string): Promise<{ detected: string; results: SearchCandidate[] }> {
  if (!rawQuery || rawQuery.trim().length < 3) throw badRequest("QUERY_TOO_SHORT", "Type at least 3 characters.");
  if (rawQuery.length > 120) throw badRequest("QUERY_TOO_LONG", "Search is limited to 120 characters.");
  const q = detectQuery(rawQuery);
  if (q.invalid) {
    throw badRequest("INVALID_IDENTIFIER", `This ${q.type} is not valid. Check the characters and try again.`, { type: q.type });
  }
  const testMode = isTestMode();
  const results: SearchCandidate[] = [];
  const providers = getProviders();

  const fromDb = async (where: Prisma.companiesWhereInput) => {
    const rows = await prisma.companies.findMany({
      where: { ...where, is_test: testMode },
      take: 20,
      include: { company_gst_registrations: { select: { gstin: true, gst_status: true } } },
    });
    for (const r of rows) results.push(toCandidate(r));
  };

  if (q.type === "GSTIN") {
    const reg = await prisma.company_gst_registrations.findUnique({ where: { gstin: q.value }, select: { company_id: true } });
    if (reg) await fromDb({ id: reg.company_id });
    else {
      const t = await providers.gst.getTaxpayer(q.value);
      if (t.outcome === "SUCCESS")
        results.push(candidateFromProvider({
          legalName: t.data.legalName ?? t.data.tradeName ?? q.value, tradeName: t.data.tradeName,
          entityType: repo.entityTypeFromConstitution(t.data.constitution), gstins: [q.value],
          stateCode: q.value.slice(0, 2), status: t.data.status, source: t.meta.provider,
        }));
      else if (t.outcome !== "NOT_FOUND") throw new AppError(502, "SEARCH_SOURCE_ERROR", "Search is slow right now. Try again or use the CIN.");
    }
  } else if (q.type === "CIN" || q.type === "LLPIN") {
    const key = q.type === "CIN" ? { cin: q.value } : { llpin: q.value };
    await fromDb(key);
    if (results.length === 0) {
      const m = await providers.mca.getCompanyMaster(key);
      if (m.outcome === "SUCCESS")
        results.push(candidateFromProvider({
          legalName: m.data.legalName, entityType: m.data.entityType, cin: m.data.cin, llpin: m.data.llpin,
          status: m.data.companyStatus, incorporationYear: Number(m.data.incorporationDate?.slice(0, 4)) || undefined, source: m.meta.provider,
        }));
      else if (m.outcome !== "NOT_FOUND") throw new AppError(502, "SEARCH_SOURCE_ERROR", "Search is slow right now. Try the GSTIN instead.");
    }
  } else if (q.type === "PAN") {
    await fromDb({ pan_hash: panHash(q.value) });
    if (results.length === 0) {
      const g = await providers.gst.getGstinsByPan(q.value);
      if (g.outcome === "SUCCESS") {
        for (const gstin of g.data.slice(0, 20)) {
          const t = await providers.gst.getTaxpayer(gstin);
          if (t.outcome === "SUCCESS")
            results.push(candidateFromProvider({
              legalName: t.data.legalName ?? gstin, tradeName: t.data.tradeName, entityType: repo.entityTypeFromConstitution(t.data.constitution),
              gstins: [gstin], stateCode: gstin.slice(0, 2), status: t.data.status, source: t.meta.provider,
            }));
        }
      }
    }
  } else {
    const like = `%${q.value.replace(/[%_\\]/g, "\\$&")}%`;
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM companies
      WHERE is_test = ${testMode}
        AND (legal_name ILIKE ${like} OR trade_name ILIKE ${like}
             OR extensions.similarity(legal_name, ${q.value}) > 0.3)
      ORDER BY extensions.similarity(legal_name, ${q.value}) DESC
      LIMIT 20`;
    if (ids.length) await fromDb({ id: { in: ids.map((r) => r.id) } });
    const p = await providers.search.searchByName(q.value);
    if (p.outcome === "SUCCESS") for (const c of p.data) results.push(candidateFromProvider(c));
    else if (p.outcome !== "NOT_FOUND" && results.length === 0)
      throw new AppError(502, "SEARCH_SOURCE_ERROR", "Search is slow right now. Try the GSTIN instead.");
  }

  const merged = dedupe(results).slice(0, 20);
  await attachPreviousChecks(ctx, merged);
  return { detected: q.type, results: merged };
}

function toCandidate(r: Prisma.companiesGetPayload<{ include: { company_gst_registrations: { select: { gstin: true; gst_status: true } } } }>): SearchCandidate {
  return {
    company_id: r.id,
    legal_name: r.legal_name,
    trade_name: r.trade_name,
    entity_type: r.entity_type,
    cin: r.cin,
    llpin: r.llpin,
    gstins: r.company_gst_registrations.map((g) => g.gstin),
    state_code: r.state_code ?? r.company_gst_registrations[0]?.gstin.slice(0, 2) ?? null,
    status: r.company_status ?? r.company_gst_registrations[0]?.gst_status ?? null,
    incorporation_year: r.incorporation_date?.getUTCFullYear() ?? null,
    previous_check: null,
  };
}

function candidateFromProvider(c: CompanyCandidate): SearchCandidate {
  return {
    company_id: null,
    legal_name: c.legalName,
    trade_name: c.tradeName ?? null,
    entity_type: c.entityType,
    cin: c.cin ?? null,
    llpin: c.llpin ?? null,
    gstins: c.gstins ?? [],
    state_code: c.stateCode ?? null,
    status: c.status ?? null,
    incorporation_year: c.incorporationYear ?? null,
    previous_check: null,
  };
}

function dedupe(list: SearchCandidate[]): SearchCandidate[] {
  const seen = new Map<string, SearchCandidate>();
  for (const c of list) {
    const key = c.cin ?? c.llpin ?? c.gstins[0] ?? `${c.legal_name}`;
    const existing = seen.get(key);
    if (!existing || (!existing.company_id && c.company_id)) seen.set(key, c);
  }
  return [...seen.values()];
}

async function attachPreviousChecks(ctx: RequestContext, list: SearchCandidate[]) {
  const ids = list.map((c) => c.company_id).filter((x): x is string => !!x);
  if (!ids.length) return;
  const price = await currentPrice();
  const checks = await prisma.company_checks.findMany({
    where: { organisation_id: ctx.organisationId, company_id: { in: ids }, status: { in: ["COMPLETED", "PARTIAL"] } },
    orderBy: { created_at: "desc" },
    select: { id: true, company_id: true, created_at: true },
  });
  for (const c of list) {
    const prev = checks.find((k) => k.company_id === c.company_id);
    if (prev)
      c.previous_check = {
        check_id: prev.id,
        checked_at: prev.created_at.toISOString(),
        free_reopen: prev.created_at > daysAgo(price.free_reopen_days),
      };
  }
}

// ======================================================================= pricing (§14 #3)

export async function currentPrice() {
  const now = new Date();
  const p = await prisma.lookup_prices.findFirst({
    where: { product_code: "COMPANY_CHECK", effective_from: { lte: now }, OR: [{ effective_to: null }, { effective_to: { gt: now } }] },
    orderBy: { effective_from: "desc" },
  });
  if (!p) throw new AppError(503, "PRICE_UNAVAILABLE", "Price unavailable, try again.");
  const gst = (p.price_paise * BigInt(Math.round(Number(p.gst_rate) * 10_000))) / 10_000n;
  return { price_paise: p.price_paise, gst_paise: gst, total_paise: p.price_paise + gst, gst_rate: Number(p.gst_rate), free_reopen_days: p.free_reopen_days };
}

// ======================================================================= start a check (§14 #4)

export const StartCheckInput = z
  .object({
    company_id: z.string().uuid().optional(),
    cin: z.string().optional(),
    llpin: z.string().optional(),
    buyer_gstin: z.string().optional(),
    credit_requested_paise: z.number().int().positive().max(1e13).optional(),
    credit_period_days: z.number().int().min(1).max(365).default(30),
    purpose: z.enum(["NEW_BUYER", "LIMIT_INCREASE", "PERIODIC_REVIEW"]),
    customer_reference: z.string().max(60).optional(),
    consent_confirmed: z.literal(true, { errorMap: () => ({ message: "Confirm why you are checking this company." }) }),
    reuse_previous: z.boolean().optional(),
    search_query: z.string().max(120).optional(),
  })
  .refine((v) => v.company_id || v.cin || v.llpin || v.buyer_gstin, { message: "Pick a company first." })
  .refine((v) => !v.buyer_gstin || isValidGstin(v.buyer_gstin), { message: "This GSTIN is not valid. Check the 15 characters.", path: ["buyer_gstin"] });

export async function startCheck(ctx: RequestContext, rawInput: unknown, idempotencyKey: string) {
  if (!idempotencyKey || idempotencyKey.length > 200) throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Missing Idempotency-Key header.");
  const input = StartCheckInput.parse(rawInput);
  await assertCanRunChecks(ctx);

  const replay = await prisma.company_checks.findUnique({
    where: { organisation_id_idempotency_key: { organisation_id: ctx.organisationId, idempotency_key: idempotencyKey } },
  });
  if (replay) return { check: replay, replayed: true as const };

  let companyId: string | null = null;
  if (input.company_id) {
    const c = await prisma.companies.findUnique({ where: { id: input.company_id }, select: { id: true } });
    if (!c) throw notFound("Company");
    companyId = c.id;
  } else {
    companyId = await findCompanyIdByIdentifiers(input);
  }
  const identifiers = {
    cin: input.cin?.toUpperCase(),
    llpin: input.llpin?.toUpperCase(),
    gstin: input.buyer_gstin?.toUpperCase(),
  };

  if (companyId) {
    const running = await prisma.company_checks.findFirst({
      where: { organisation_id: ctx.organisationId, company_id: companyId, status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
    });
    if (running) throw new AppError(409, "CHECK_IN_PROGRESS", "A check on this company is already running.", { check_id: running.id });
  }

  const price = await currentPrice();

  // Free re-open of a recent check (PRD §5.1, TC-13).
  if (input.reuse_previous && companyId) {
    const prev = await prisma.company_checks.findFirst({
      where: { organisation_id: ctx.organisationId, company_id: companyId, status: { in: ["COMPLETED", "PARTIAL"] }, created_at: { gt: daysAgo(price.free_reopen_days) } },
      orderBy: { created_at: "desc" },
      include: { company_check_sections: true },
    });
    if (prev) return reopen(ctx, prev, input, idempotencyKey);
  }

  try {
    const check = await withTx(async (tx) => {
      const created = await tx.company_checks.create({
        data: {
          organisation_id: ctx.organisationId,
          requested_by: ctx.userId,
          company_id: companyId,
          search_query: input.search_query ?? null,
          input_identifiers: identifiers,
          credit_requested_paise: input.credit_requested_paise ? BigInt(input.credit_requested_paise) : null,
          credit_period_days: input.credit_period_days,
          purpose: input.purpose,
          customer_reference: input.customer_reference ?? null,
          consent_at: new Date(),
          status: "QUEUED",
          price_paise: price.price_paise,
          gst_paise: price.gst_paise,
          charge_status: "CHARGED",
          idempotency_key: idempotencyKey,
          correlation_id: ctx.correlationId,
        },
      });
      await tx.company_check_sections.createMany({
        data: SECTIONS.map((section) => ({ company_check_id: created.id, organisation_id: ctx.organisationId, section })),
      });
      // The ledger trigger updates the wallet row (row lock) and raises INSUFFICIENT_BALANCE if it would go negative.
      await tx.wallet_ledger.create({
        data: {
          organisation_id: ctx.organisationId,
          entry_type: "CHECK_DEBIT",
          amount_paise: -price.total_paise,
          balance_after_paise: 0n, // set by trigger
          reference_type: "company_check",
          reference_id: created.id,
          created_by: ctx.userId,
        },
      });
      await audit(tx, ctx, "company_check.created", "company_check", created.id, { price_paise: price.total_paise.toString() });
      await audit(tx, ctx, "wallet.debited", "company_check", created.id, { amount_paise: price.total_paise.toString() });
      await outbox(tx, "company_check.created", ctx.organisationId, { check_id: created.id });
      return created;
    });
    return { check, replayed: false as const };
  } catch (e) {
    if (e instanceof Error && e.message.includes("INSUFFICIENT_BALANCE")) {
      throw new AppError(402, "INSUFFICIENT_BALANCE", "Your wallet balance is too low for this check. Top up to continue.", {
        required_paise: Number(price.total_paise),
      });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.company_checks.findUnique({
        where: { organisation_id_idempotency_key: { organisation_id: ctx.organisationId, idempotency_key: idempotencyKey } },
      });
      if (again) return { check: again, replayed: true as const };
    }
    throw e;
  }
}

async function findCompanyIdByIdentifiers(i: { cin?: string; llpin?: string; buyer_gstin?: string }): Promise<string | null> {
  if (i.cin) return (await prisma.companies.findUnique({ where: { cin: i.cin.toUpperCase() }, select: { id: true } }))?.id ?? null;
  if (i.llpin) return (await prisma.companies.findUnique({ where: { llpin: i.llpin.toUpperCase() }, select: { id: true } }))?.id ?? null;
  if (i.buyer_gstin)
    return (await prisma.company_gst_registrations.findUnique({ where: { gstin: i.buyer_gstin.toUpperCase() }, select: { company_id: true } }))?.company_id ?? null;
  return null;
}

async function reopen(
  ctx: RequestContext,
  prev: Prisma.company_checksGetPayload<{ include: { company_check_sections: true } }>,
  input: z.infer<typeof StartCheckInput>,
  idempotencyKey: string,
) {
  const check = await withTx(async (tx) => {
    const created = await tx.company_checks.create({
      data: {
        organisation_id: ctx.organisationId,
        requested_by: ctx.userId,
        company_id: prev.company_id,
        search_query: input.search_query ?? prev.search_query,
        input_identifiers: prev.input_identifiers ?? undefined,
        credit_requested_paise: input.credit_requested_paise ? BigInt(input.credit_requested_paise) : prev.credit_requested_paise,
        credit_period_days: input.credit_period_days,
        purpose: input.purpose,
        customer_reference: input.customer_reference ?? null,
        consent_at: new Date(),
        status: "ASSESSING",
        charge_status: "FREE_REOPEN",
        reused_from_check_id: prev.id,
        idempotency_key: idempotencyKey,
        correlation_id: ctx.correlationId,
        started_at: new Date(),
      },
    });
    await tx.company_check_sections.createMany({
      data: prev.company_check_sections.map((s) => ({
        company_check_id: created.id, organisation_id: ctx.organisationId, section: s.section, status: s.status,
        provider: s.provider, served_from_cache: true, completed_at: new Date(),
      })),
    });
    await audit(tx, ctx, "company_check.reopened", "company_check", created.id, { reused_from: prev.id });
    return created;
  });
  await createAssessment(check.id, ctx.organisationId, check.credit_requested_paise);
  const done = await prisma.company_checks.update({ where: { id: check.id }, data: { status: prev.status, completed_at: new Date() } });
  return { check: done, replayed: false as const };
}

// ======================================================================= run a check (worker, §8.2 steps 6–9)

type SectionOutcome = { status: "SUCCESS" | "NOT_AVAILABLE" | "SOURCE_ERROR" | "SKIPPED"; provider?: string; error?: string; cache?: boolean };
type SectionUpdate = Omit<SectionOutcome, "status"> & { status: SectionOutcome["status"] | "RUNNING" };

async function callProvider<T>(
  checkId: string,
  organisationId: string,
  correlationId: string,
  fn: () => Promise<ProviderResult<T>>,
  opts: { timeoutMs?: number; retries?: number; backoffMs?: number[] } = {},
): Promise<ProviderResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const backoff = opts.backoffMs ?? [1_000, 3_000, 9_000];
  const retries = opts.retries ?? 3;
  let last: ProviderResult<T> | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const started = Date.now();
    let result: ProviderResult<T>;
    try {
      result = await Promise.race([
        fn(),
        new Promise<ProviderResult<T>>((resolve) =>
          setTimeout(() => resolve({ outcome: "TIMEOUT", error: "Timed out", meta: { provider: "unknown", operation: "unknown", mode: providerMode(), latencyMs: timeoutMs, costPaise: 0n } }), timeoutMs),
        ),
      ]);
    } catch (e) {
      result = { outcome: "ERROR", error: e instanceof Error ? e.message : "Provider error", meta: { provider: "unknown", operation: "unknown", mode: providerMode(), latencyMs: Date.now() - started, costPaise: 0n } };
    }
    await prisma.provider_calls.create({
      data: {
        company_check_id: checkId,
        organisation_id: organisationId,
        provider: result.meta.provider,
        operation: result.meta.operation,
        mode: result.meta.mode,
        http_status: result.meta.httpStatus ?? null,
        outcome: result.outcome,
        latency_ms: result.meta.latencyMs,
        cost_paise: result.meta.costPaise,
        correlation_id: correlationId,
      },
    });
    last = result;
    const retryable = result.outcome === "TIMEOUT" || result.outcome === "ERROR" || result.outcome === "RATE_LIMITED";
    if (!retryable || attempt === retries) break;
    await new Promise((r) => setTimeout(r, backoff[Math.min(attempt, backoff.length - 1)]));
  }
  return last!;
}

const outcomeToStatus = (r: ProviderResult<unknown>): SectionOutcome =>
  r.outcome === "SUCCESS"
    ? { status: "SUCCESS", provider: r.meta.provider }
    : r.outcome === "NOT_FOUND"
      ? { status: "NOT_AVAILABLE", provider: r.meta.provider, error: "Not found at source" }
      : { status: "SOURCE_ERROR", provider: r.meta.provider, error: r.outcome };

async function setSection(checkId: string, section: Section, s: SectionUpdate) {
  await prisma.company_check_sections.update({
    where: { company_check_id_section: { company_check_id: checkId, section } },
    data: {
      status: s.status,
      provider: s.provider ?? null,
      served_from_cache: s.cache ?? false,
      last_error: s.error ?? null,
      attempts: { increment: s.status === "RUNNING" ? 1 : 0 },
      completed_at: s.status === "RUNNING" ? null : new Date(),
    },
  });
}

export interface RunOptions { timeoutMs?: number; retries?: number; backoffMs?: number[] }

/** Fetch every section, normalise, assess, settle the charge. Safe to call once per check. */
export async function runCheck(checkId: string, opts: RunOptions = {}) {
  const check = await prisma.company_checks.findUnique({ where: { id: checkId } });
  if (!check || check.status !== "QUEUED") return;
  const claimed = await prisma.company_checks.updateMany({ where: { id: checkId, status: "QUEUED" }, data: { status: "FETCHING", started_at: new Date() } });
  if (claimed.count === 0) return; // another worker took it

  const org = check.organisation_id;
  const corr = check.correlation_id;
  const testMode = isTestMode();
  const providers = getProviders();
  const call = <T,>(fn: () => Promise<ProviderResult<T>>) => callProvider(checkId, org, corr, fn, opts);
  const now = () => new Date();

  const ids = (check.input_identifiers ?? {}) as { cin?: string; llpin?: string; gstin?: string };
  let companyId = check.company_id;
  let company = companyId ? await prisma.companies.findUnique({ where: { id: companyId }, include: { company_gst_registrations: true } }) : null;
  const mcaId = { cin: company?.cin ?? ids.cin, llpin: company?.llpin ?? ids.llpin };
  const hasMcaId = !!(mcaId.cin || mcaId.llpin);
  const knownGstins = new Set<string>([...(company?.company_gst_registrations.map((g) => g.gstin) ?? []), ...(ids.gstin ? [ids.gstin] : [])]);
  const outcomes = new Map<Section, SectionOutcome>();

  try {
    // ---- 1. identity: MCA master (companies, LLPs) -----------------------------------------
    if (!hasMcaId) {
      for (const s of ["MCA_MASTER", "DIRECTORS", "FINANCIALS", "CHARGES"] as Section[]) {
        outcomes.set(s, { status: "NOT_AVAILABLE", error: "Not registered with MCA (proprietorship / partnership)" });
      }
    } else if (company?.mca_synced_at && company.mca_synced_at > daysAgo(FRESH_DAYS.mca)) {
      outcomes.set("MCA_MASTER", { status: "SUCCESS", provider: "cache", cache: true });
    } else {
      await setSection(checkId, "MCA_MASTER", { status: "RUNNING" });
      const r = await call(() => providers.mca.getCompanyMaster(mcaId));
      if (r.outcome === "SUCCESS" && ((mcaId.cin && r.data.cin !== mcaId.cin) || (mcaId.llpin && r.data.llpin !== mcaId.llpin))) {
        outcomes.set("MCA_MASTER", { status: "SOURCE_ERROR", provider: r.meta.provider, error: "Source returned a different company" });
      } else {
        outcomes.set("MCA_MASTER", outcomeToStatus(r));
        if (r.outcome === "SUCCESS") {
          companyId = await withTx(async (tx) => {
            const id = await repo.upsertCompanyFromMaster(tx, r.data, now(), testMode);
            await repo.replaceMcaContacts(tx, id, r.data, r.meta.provider, now());
            return id;
          });
          if (r.data.pan) {
            const g = await call(() => providers.gst.getGstinsByPan(r.data.pan!));
            if (g.outcome === "SUCCESS") g.data.forEach((x) => knownGstins.add(x));
          }
        }
      }
    }

    // ---- 2. GST profile (needed to create GST-only businesses) ------------------------------
    const gstFresh = company?.gst_synced_at && company.gst_synced_at > daysAgo(FRESH_DAYS.gst) && knownGstins.size > 0;
    const registrationIds: string[] = [];
    if (gstFresh) {
      outcomes.set("GST_PROFILE", { status: "SUCCESS", provider: "cache", cache: true });
      registrationIds.push(...company!.company_gst_registrations.map((g) => g.id));
    } else if (knownGstins.size === 0) {
      outcomes.set("GST_PROFILE", { status: "NOT_AVAILABLE", error: "No GSTIN found for this company" });
    } else {
      await setSection(checkId, "GST_PROFILE", { status: "RUNNING" });
      const results = await Promise.all([...knownGstins].map((g) => call(() => providers.gst.getTaxpayer(g)).then((r) => ({ g, r }))));
      const ok = results.filter((x) => x.r.outcome === "SUCCESS");
      for (const { g, r } of ok) {
        if (r.outcome !== "SUCCESS") continue;
        if (r.data.gstin !== g) continue; // provider returned another entity
        const id = await withTx(async (tx) => {
          const cid = companyId ?? (await repo.upsertCompanyFromTaxpayer(tx, r.data, now(), testMode));
          companyId = cid;
          return repo.upsertGstRegistration(tx, cid, r.data, r.meta.provider, now());
        });
        registrationIds.push(id);
      }
      outcomes.set(
        "GST_PROFILE",
        ok.length > 0 ? { status: "SUCCESS", provider: ok[0].r.meta.provider } : outcomeToStatus(results[0].r),
      );
    }

    if (companyId && companyId !== check.company_id) {
      await prisma.company_checks.update({ where: { id: checkId }, data: { company_id: companyId } });
    }

    // ---- 3. remaining sections in parallel ---------------------------------------------------
    const tasks: Promise<void>[] = [];
    const run = (section: Section, fn: () => Promise<SectionOutcome>) =>
      tasks.push(
        (async () => {
          await setSection(checkId, section, { status: "RUNNING" });
          outcomes.set(section, await fn());
        })(),
      );

    if (hasMcaId && companyId && outcomes.get("MCA_MASTER")?.status === "SUCCESS") {
      const fresh = outcomes.get("MCA_MASTER")?.cache;
      run("DIRECTORS", async () => {
        if (fresh) return { status: "SUCCESS", provider: "cache", cache: true };
        const r = await call(() => providers.mca.getDirectors(mcaId));
        if (r.outcome === "SUCCESS") await withTx((tx) => repo.replaceDirectors(tx, companyId!, r.data, r.meta.provider, now()));
        return outcomeToStatus(r);
      });
      run("CHARGES", async () => {
        if (fresh) return { status: "SUCCESS", provider: "cache", cache: true };
        const r = await call(() => providers.mca.getCharges(mcaId));
        if (r.outcome === "SUCCESS") await withTx((tx) => repo.replaceCharges(tx, companyId!, r.data, r.meta.provider, now()));
        return outcomeToStatus(r);
      });
      run("FINANCIALS", async () => {
        if (company?.financials_synced_at && company.financials_synced_at > daysAgo(FRESH_DAYS.financials)) {
          return { status: "SUCCESS", provider: "cache", cache: true };
        }
        const r = await call(() => providers.financials.getFinancials(mcaId, 4));
        if (r.outcome === "SUCCESS") await withTx((tx) => repo.replaceFinancials(tx, companyId!, r.data, r.meta.provider, now()));
        return outcomeToStatus(r);
      });
    } else if (hasMcaId) {
      for (const s of ["DIRECTORS", "CHARGES", "FINANCIALS"] as Section[])
        outcomes.set(s, { status: outcomes.get("MCA_MASTER")?.status === "SOURCE_ERROR" ? "SOURCE_ERROR" : "NOT_AVAILABLE", error: "Company record not available" });
    }

    if (registrationIds.length > 0 && !gstFresh) {
      run("GST_FILINGS", async () => {
        const regs = await prisma.company_gst_registrations.findMany({ where: { id: { in: registrationIds } }, select: { id: true, gstin: true } });
        const res = await Promise.all(regs.map((g) => call(() => providers.gst.getFilingStatus(g.gstin, 12)).then((r) => ({ g, r }))));
        for (const { g, r } of res) if (r.outcome === "SUCCESS") await withTx((tx) => repo.replaceGstFilings(tx, g.id, r.data, r.meta.provider, now()));
        const ok = res.find((x) => x.r.outcome === "SUCCESS");
        return ok ? { status: "SUCCESS", provider: ok.r.meta.provider } : outcomeToStatus(res[0].r);
      });
    } else {
      outcomes.set("GST_FILINGS", gstFresh ? { status: "SUCCESS", provider: "cache", cache: true } : { status: "NOT_AVAILABLE", error: "No GST registration" });
    }

    await Promise.all(tasks);
    await Promise.all(SECTIONS.map((s) => setSection(checkId, s, outcomes.get(s) ?? { status: "SKIPPED" })));

    // ---- 4. settle -------------------------------------------------------------------------
    const coreOk = CORE_SECTIONS.some((s) => outcomes.get(s)?.status === "SUCCESS");
    if (!coreOk || !companyId) {
      await failAndRefund(checkId, "NO_CORE_DATA");
      return;
    }
    await prisma.company_checks.update({ where: { id: checkId }, data: { status: "ASSESSING" } });
    await createAssessment(checkId, org, check.credit_requested_paise);
    const partial = SECTIONS.some((s) => outcomes.get(s)?.status === "SOURCE_ERROR");
    const status = partial ? "PARTIAL" : "COMPLETED";
    await prisma.company_checks.update({ where: { id: checkId }, data: { status, completed_at: new Date() } });
    await audit(prisma, null, `company_check.${status.toLowerCase()}`, "company_check", checkId, { organisation_id: org });
    await outbox(prisma, `company_check.${status.toLowerCase()}`, org, { check_id: checkId });
  } catch (e) {
    console.error("[company-check] run failed", { checkId, correlationId: corr, error: e instanceof Error ? e.message : String(e) });
    await failAndRefund(checkId, "INTERNAL_ERROR");
  }
}

async function failAndRefund(checkId: string, errorCode: string) {
  await withTx(async (tx) => {
    const c = await tx.company_checks.findUnique({ where: { id: checkId } });
    if (!c) return;
    if (c.charge_status === "CHARGED") {
      await tx.wallet_ledger.create({
        data: {
          organisation_id: c.organisation_id,
          entry_type: "REFUND",
          amount_paise: c.price_paise + c.gst_paise,
          balance_after_paise: 0n,
          reference_type: "company_check",
          reference_id: c.id,
        },
      });
    }
    await tx.company_checks.update({
      where: { id: checkId },
      data: { status: "FAILED", error_code: errorCode, completed_at: new Date(), charge_status: c.charge_status === "CHARGED" ? "REFUNDED" : c.charge_status },
    });
    await audit(tx, null, "company_check.failed", "company_check", checkId, { organisation_id: c.organisation_id, error_code: errorCode });
    if (c.charge_status === "CHARGED") await audit(tx, null, "wallet.refunded", "company_check", checkId, { organisation_id: c.organisation_id });
    await outbox(tx, "company_check.failed", c.organisation_id, { check_id: checkId, error_code: errorCode });
  });
}

// ======================================================================= assessment (§9)

export async function buildEngineInput(companyId: string, requestedPaise: bigint | null, asOf = new Date()): Promise<CreditEngineInput> {
  const c = await prisma.companies.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      company_financials: true,
      company_gst_registrations: { include: { gst_return_filings: true } },
      company_directors: { include: { directors: true } },
      company_charges: true,
    },
  });
  const standaloneYears = new Map<string, bigint | null>();
  for (const f of c.company_financials) {
    if (f.statement_type === "STANDALONE" || !standaloneYears.has(f.fiscal_year))
      standaloneYears.set(f.fiscal_year, f.revenue_from_operations_paise);
  }
  const activeGsts = c.company_gst_registrations;
  const registeredWithMca = !!(c.cin || c.llpin);
  const currentDirectors = c.company_directors.filter((d) => !d.ceased_on);
  return {
    asOf: isoDate(asOf)!,
    entityRegisteredWithMca: registeredWithMca,
    companyStatus: c.company_status,
    gstStatuses: activeGsts.map((g) => g.gst_status),
    incorporationDate: isoDate(c.incorporation_date),
    lastBalanceSheetDate: isoDate(c.last_balance_sheet_date),
    financials: [...standaloneYears].map(([fiscalYear, revenuePaise]) => ({ fiscalYear, revenuePaise })),
    gstFilings: activeGsts.flatMap((g) =>
      g.gst_return_filings.map((f) => ({ returnType: f.return_type, taxPeriod: f.tax_period, dueDate: isoDate(f.due_date), filedOn: isoDate(f.filed_on) })),
    ),
    activeDirectors: registeredWithMca && c.mca_synced_at ? currentDirectors.length : null,
    disqualifiedDirectors: registeredWithMca && c.mca_synced_at
      ? currentDirectors.filter((d) => /disqualif/i.test(d.directors.din_status ?? "")).length
      : null,
    openChargesPaise: registeredWithMca && c.mca_synced_at
      ? c.company_charges.filter((x) => x.charge_status === "OPEN").reduce((sum, x) => sum + (x.amount_paise ?? 0n), 0n)
      : null,
    requestedPaise,
  };
}

async function activePolicy() {
  const p = await prisma.credit_policies.findFirst({ where: { status: "ACTIVE" } });
  if (!p) throw new AppError(503, "NO_ACTIVE_POLICY", "Credit policy not configured.");
  return { id: p.id, version: p.version, params: p.params as unknown as CreditPolicyParams };
}

async function createAssessment(checkId: string, organisationId: string, requestedPaise: bigint | null) {
  const check = await prisma.company_checks.findUniqueOrThrow({ where: { id: checkId }, select: { company_id: true } });
  const policy = await activePolicy();
  const input = await buildEngineInput(check.company_id!, requestedPaise);
  const r = assessCredit(input, policy.params);
  const row = await prisma.credit_assessments.create({
    data: {
      company_check_id: checkId,
      organisation_id: organisationId,
      policy_id: policy.id,
      policy_version: policy.version,
      inputs: JSON.parse(JSON.stringify(input, bigintReplacer)),
      turnover_latest_paise: r.turnoverLatestPaise,
      turnover_cagr: r.turnoverCagr,
      gst_ontime_ratio: r.gstOnTimeRatio,
      multipliers: r.multipliers ?? Prisma.JsonNull,
      score: r.score,
      risk_band: r.riskBand,
      confidence: r.confidence,
      recommended_limit_paise: r.recommendedLimitPaise,
      requested_amount_paise: r.requestedPaise,
      exceeds_limit: r.exceedsLimit,
      exceed_ratio: r.exceedRatio,
      factors: JSON.parse(JSON.stringify(r.factors)),
      hard_stops: r.hardStops,
    },
  });
  await audit(prisma, null, "credit_assessment.created", "credit_assessment", row.id, { organisation_id: organisationId, check_id: checkId });
  await outbox(prisma, "credit_assessment.created", organisationId, { check_id: checkId, assessment_id: row.id });
  return { row, verdict: r.requestVerdict };
}

/** Re-run only the comparison with a new requested amount (free; §8.2 step 11). */
export async function reassess(ctx: RequestContext, checkId: string, rawInput: unknown) {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view checks only.");
  const input = z.object({ requested_amount_paise: z.number().int().positive().max(1e13).nullable() }).parse(rawInput);
  const check = await getOwnCheck(ctx, checkId);
  if (!["COMPLETED", "PARTIAL"].includes(check.status)) throw new AppError(409, "CHECK_NOT_READY", "The report is not ready yet.");
  const { row } = await createAssessment(check.id, ctx.organisationId, input.requested_amount_paise === null ? null : BigInt(input.requested_amount_paise));
  return row;
}

// ======================================================================= decision (§14 #9)

export const DecisionInput = z.object({
  decision: z.enum(["APPROVED_AS_REQUESTED", "APPROVED_REDUCED", "DECLINED", "ON_HOLD"]),
  approved_amount_paise: z.number().int().positive().max(1e13).optional(),
  credit_period_days: z.number().int().min(1).max(365).optional(),
  override_reason: z.string().trim().max(500).optional(),
  notes: z.string().max(1000).optional(),
  assessment_id: z.string().uuid().optional(),
});

export async function recordDecision(ctx: RequestContext, checkId: string, rawInput: unknown) {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view checks only.");
  const input = DecisionInput.parse(rawInput);
  const check = await getOwnCheck(ctx, checkId);
  const assessment = await prisma.credit_assessments.findFirst({
    where: { company_check_id: check.id, organisation_id: ctx.organisationId, ...(input.assessment_id ? { id: input.assessment_id } : {}) },
    orderBy: { created_at: "desc" },
  });
  if (!assessment) throw new AppError(409, "CHECK_NOT_READY", "There is no assessment to decide on yet.");

  const approving = input.decision === "APPROVED_AS_REQUESTED" || input.decision === "APPROVED_REDUCED";
  if (approving && !input.approved_amount_paise) throw badRequest("APPROVED_AMOUNT_REQUIRED", "Enter the amount you are approving.");
  const approved = input.approved_amount_paise ? BigInt(input.approved_amount_paise) : null;
  const recommended = assessment.recommended_limit_paise;
  const aboveLimit = approving && approved !== null && (recommended === null || approved > recommended);
  if (aboveLimit) {
    if (ctx.role !== "OWNER") throw forbidden("OWNER_APPROVAL_REQUIRED", "Only the account owner can approve more than the recommended limit.");
    if (!input.override_reason) throw badRequest("OVERRIDE_REASON_REQUIRED", "Give a reason for approving more than the recommended limit.");
  }

  return withTx(async (tx) => {
    const row = await tx.credit_decisions.create({
      data: {
        credit_assessment_id: assessment.id,
        organisation_id: ctx.organisationId,
        decided_by: ctx.userId,
        decision: input.decision,
        approved_amount_paise: approved,
        credit_period_days: input.credit_period_days ?? check.credit_period_days,
        override_reason: aboveLimit ? input.override_reason! : null,
        notes: input.notes ?? null,
      },
    });
    await audit(tx, ctx, "credit_decision.recorded", "credit_decision", row.id, {
      check_id: check.id, decision: input.decision, approved_amount_paise: approved?.toString() ?? null, above_limit: aboveLimit,
    });
    await outbox(tx, "credit_decision.recorded", ctx.organisationId, { check_id: check.id, decision_id: row.id });
    return row;
  });
}

// ======================================================================= read (§14 #5, #11, #13)

async function getOwnCheck(ctx: RequestContext, checkId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(checkId)) throw notFound("Check");
  // 404 (not 403) for other organisations' checks, so existence is not leaked (TC-15).
  const check = await prisma.company_checks.findFirst({ where: { id: checkId, organisation_id: ctx.organisationId } });
  if (!check) throw notFound("Check");
  return check;
}

export async function getCheckReport(ctx: RequestContext, checkId: string) {
  const check = await getOwnCheck(ctx, checkId);
  const sections = await prisma.company_check_sections.findMany({
    where: { company_check_id: check.id },
    select: { section: true, status: true, provider: true, served_from_cache: true, last_error: true, completed_at: true },
  });
  const assessment = await prisma.credit_assessments.findFirst({ where: { company_check_id: check.id }, orderBy: { created_at: "desc" } });
  const decision = assessment
    ? await prisma.credit_decisions.findFirst({ where: { credit_assessment_id: assessment.id }, orderBy: { created_at: "desc" } })
    : null;

  let company = null;
  if (check.company_id && ["COMPLETED", "PARTIAL", "ASSESSING"].includes(check.status)) {
    const c = await prisma.companies.findUniqueOrThrow({
      where: { id: check.company_id },
      include: {
        company_financials: { orderBy: { fiscal_year: "desc" } },
        company_gst_registrations: { include: { gst_return_filings: { orderBy: { tax_period: "desc" } } } },
        company_directors: { include: { directors: true } },
        company_charges: true,
        company_contacts: true,
      },
    });
    const { pan_enc: _enc, pan_hash: _hash, ...safe } = c; // never return PAN material
    void _enc; void _hash;
    company = safe;
  }
  const gstVerifications = await prisma.gst_verifications.findMany({
    where: { company_check_id: check.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true, gstin: true, status: true, signatory_email_masked: true, verified_at: true, legal_name: true,
      trade_name: true, constitution: true, name_matches_company: true, certificate_sha256: true, provider: true, created_at: true,
    },
  });
  return {
    id: check.id,
    status: check.status,
    charge_status: check.charge_status,
    charged_paise: check.charge_status === "CHARGED" ? check.price_paise + check.gst_paise : 0n,
    credit_requested_paise: check.credit_requested_paise,
    credit_period_days: check.credit_period_days,
    purpose: check.purpose,
    created_at: check.created_at,
    completed_at: check.completed_at,
    error_code: check.error_code,
    sections,
    company,
    assessment,
    decision,
    gst_verifications: gstVerifications,
  };
}

export async function listChecks(ctx: RequestContext, params: { page?: number; band?: string; decision?: string; from?: string; to?: string }) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.company_checksWhereInput = {
    organisation_id: ctx.organisationId,
    ...(params.from || params.to ? { created_at: { ...(params.from ? { gte: new Date(params.from) } : {}), ...(params.to ? { lte: new Date(params.to) } : {}) } } : {}),
    ...(params.band ? { credit_assessments: { some: { risk_band: params.band as never } } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.company_checks.count({ where }),
    prisma.company_checks.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * 25,
      take: 25,
      include: {
        companies: { select: { legal_name: true, cin: true } },
        credit_assessments: { orderBy: { created_at: "desc" }, take: 1, include: { credit_decisions: { orderBy: { created_at: "desc" }, take: 1 } } },
      },
    }),
  ]);
  return {
    page,
    total,
    items: rows.map((r) => {
      const a = r.credit_assessments[0];
      return {
        id: r.id,
        status: r.status,
        company: r.companies,
        checked_at: r.created_at,
        requested_by: r.requested_by,
        recommended_limit_paise: a?.recommended_limit_paise ?? null,
        requested_amount_paise: a?.requested_amount_paise ?? r.credit_requested_paise,
        risk_band: a?.risk_band ?? null,
        decision: a?.credit_decisions[0]?.decision ?? null,
      };
    }),
  };
}

export async function getWallet(ctx: RequestContext) {
  const w = await prisma.wallets.findUnique({ where: { organisation_id: ctx.organisationId } });
  const ledger = await prisma.wallet_ledger.findMany({ where: { organisation_id: ctx.organisationId }, orderBy: { created_at: "desc" }, take: 50 });
  return { balance_paise: w?.balance_paise ?? 0n, ledger };
}

// ======================================================================= company card (§14 #2)

/** Identity card for the confirm screen: cached registry facts only, nothing paid. */
export async function getCompanyCard(_ctx: RequestContext, companyId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) throw notFound("Company");
  const c = await prisma.companies.findFirst({
    where: { id: companyId, is_test: isTestMode() },
    select: {
      id: true, legal_name: true, trade_name: true, entity_type: true, cin: true, llpin: true,
      company_status: true, state_code: true, incorporation_date: true,
      company_gst_registrations: { select: { gstin: true, gst_status: true, state_code: true } },
    },
  });
  if (!c) throw notFound("Company");
  return c;
}

// ======================================================================= onboarding (foundation)

export const OnboardingInput = z.object({
  legal_name: z.string().trim().min(2).max(200),
  gstin: z.string().trim().toUpperCase().refine(isValidGstin, "This GSTIN is not valid.").optional(),
  full_name: z.string().trim().min(1).max(120).optional(),
});

/**
 * First sign-in: create the user's profile and organisation (OWNER). KYC starts PENDING and there is
 * no subscription, so checks stay locked until an admin verifies the organisation (PRD §5.3).
 */
export async function createOrganisationForUser(userId: string, rawInput: unknown) {
  const input = OnboardingInput.parse(rawInput);
  const existing = await prisma.organisation_members.findFirst({ where: { user_id: userId }, select: { organisation_id: true } });
  if (existing) throw new AppError(409, "ALREADY_ONBOARDED", "You already belong to an organisation.", { organisation_id: existing.organisation_id });
  const authUser = await prisma.$queryRaw<{ phone: string | null; email: string | null }[]>`
    SELECT phone, email FROM auth.users WHERE id = ${userId}::uuid`;
  return withTx(async (tx) => {
    await tx.app_users.upsert({
      where: { id: userId },
      create: { id: userId, phone: authUser[0]?.phone ?? null, email: authUser[0]?.email ?? null, full_name: input.full_name ?? null },
      update: { full_name: input.full_name ?? undefined },
    });
    const org = await tx.organisations.create({ data: { legal_name: input.legal_name, gstin: input.gstin ?? null } });
    await tx.organisation_members.create({ data: { organisation_id: org.id, user_id: userId, role: "OWNER" } });
    await tx.wallets.create({ data: { organisation_id: org.id } });
    await audit(tx, { organisationId: org.id, userId, correlationId: crypto.randomUUID() }, "organisation.created", "organisation", org.id);
    return org;
  });
}
