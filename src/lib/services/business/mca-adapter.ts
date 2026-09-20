/**
 * MCA Adapter — Live Government Data.gov.in API Mode & Manual Fallback
 *
 * Integrated with the Ministry of Corporate Affairs (data.gov.in)
 * RoC-wise Company Master Data API (Resource ID: 4dbe5667-7b6b-41d7-82af-211562424d9a)
 * Over 3.6 million registered Indian corporate entities.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export const MCA_DEFAULT_API_KEY = "579b464db66ec23bdd000001c2fe5c8eee274b5751c009ca66811152";
export const MCA_RESOURCE_ENDPOINT = "https://api.data.gov.in/resource/4dbe5667-7b6b-41d7-82af-211562424d9a";

export const MCA_PORTAL_BASE = "https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do";
export const MCA_SEARCH_URL = "https://efiling.mca.gov.in/eFiling/helperPages/companySearch!search.action";

export interface McaLiveRecord {
  cin: string;
  companyName: string;
  roc: string;
  companyCategory: string;
  companySubCategory: string;
  companyClass: string;
  authorizedCapital: number;
  paidUpCapital: number;
  incorporationDate: string;
  registeredAddress: string;
  listingStatus: string;
  status: string; // Active | Strike Off | Amalgamated | Dissolved
  stateCode: string;
  country: string;
  nicCode: string;
  industrialClassification: string;
}

export interface McaApiResponse {
  success: boolean;
  total: number;
  count: number;
  records: McaLiveRecord[];
  source: string;
  error?: string;
}

/** Get the configured MCA API key */
export function getMcaApiKey(): string {
  return (
    process.env.MCA_API_KEY ||
    process.env.DATA_GOV_IN_API_KEY ||
    MCA_DEFAULT_API_KEY
  );
}

/** Construct the best search URL given available identifiers */
export function getMcaPortalUrl(params: {
  cin?: string | null;
  companyName?: string | null;
}): string {
  if (params.cin) {
    return `${MCA_PORTAL_BASE}?cin=${encodeURIComponent(params.cin)}`;
  }
  if (params.companyName) {
    return `${MCA_SEARCH_URL}?companyName=${encodeURIComponent(params.companyName)}`;
  }
  return "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html";
}

/**
 * Fetch live company master data from data.gov.in MCA API.
 * Supports exact CIN filter or CompanyName filter.
 */
export async function fetchLiveMcaCompanyData(params: {
  cin?: string | null;
  companyName?: string | null;
  limit?: number;
}): Promise<McaApiResponse> {
  const apiKey = getMcaApiKey();
  const limit = params.limit || 5;

  const url = new URL(MCA_RESOURCE_ENDPOINT);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  if (params.cin && params.cin.trim()) {
    url.searchParams.set("filters[CIN]", params.cin.trim().toUpperCase());
  } else if (params.companyName && params.companyName.trim()) {
    url.searchParams.set("filters[CompanyName]", params.companyName.trim());
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        total: 0,
        count: 0,
        records: [],
        source: "data.gov.in (MCA21)",
        error: `MCA API returned status ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const rawRecords = Array.isArray(data.records) ? data.records : [];

    const records: McaLiveRecord[] = rawRecords.map((r: any) => ({
      cin: String(r.CIN || "").trim(),
      companyName: String(r.CompanyName || "").trim(),
      roc: String(r.CompanyROCcode || "").trim(),
      companyCategory: String(r.CompanyCategory || "").trim(),
      companySubCategory: String(r.CompanySubCategory || "").trim(),
      companyClass: String(r.CompanyClass || "").trim(),
      authorizedCapital: Number(r.AuthorizedCapital) || 0,
      paidUpCapital: Number(r.PaidupCapital) || 0,
      incorporationDate: String(r.CompanyRegistrationdate_date || "").trim(),
      registeredAddress: String(r.Registered_Office_Address || "").trim(),
      listingStatus: String(r.Listingstatus || "Unlisted").trim(),
      status: String(r.CompanyStatus || "Active").trim(),
      stateCode: String(r.CompanyStateCode || "").trim(),
      country: String(r["CompanyIndian/Foreign Company"] || "India").trim(),
      nicCode: String(r.nic_code || "").trim(),
      industrialClassification: String(r.CompanyIndustrialClassification || "").trim(),
    }));

    return {
      success: true,
      total: Number(data.total) || records.length,
      count: records.length,
      records,
      source: "Ministry of Corporate Affairs (data.gov.in MCA21)",
    };
  } catch (err: any) {
    return {
      success: false,
      total: 0,
      count: 0,
      records: [],
      source: "data.gov.in (MCA21)",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Sync live MCA record directly to a BusinessProfile and complete the MCA task.
 */
export async function syncMcaLiveRecordToBusiness({
  businessId,
  cin,
  companyName,
  actor = "SYSTEM_MCA_API",
}: {
  businessId: string;
  cin?: string | null;
  companyName?: string | null;
  actor?: string;
}): Promise<{
  success: boolean;
  record?: McaLiveRecord;
  sourceRecordId?: string;
  error?: string;
}> {
  const result = await fetchLiveMcaCompanyData({ cin, companyName, limit: 1 });

  if (!result.success || result.records.length === 0) {
    return {
      success: false,
      error: result.error || "No matching corporate record found in MCA registry.",
    };
  }

  const live = result.records[0];

  // Store in BusinessSourceRecord
  const sourceRecord = await prisma.businessSourceRecord.create({
    data: {
      businessId,
      sourceType: "MCA",
      sourceStatus: "VERIFIED",
      rawPayload: JSON.stringify(live),
      parsedFields: JSON.stringify({
        cin: live.cin,
        companyName: live.companyName,
        roc: live.roc,
        status: live.status,
        companyClass: live.companyClass,
        companyCategory: live.companyCategory,
        authorizedCapital: live.authorizedCapital,
        paidUpCapital: live.paidUpCapital,
        incorporationDate: live.incorporationDate,
        registeredAddress: live.registeredAddress,
        stateCode: live.stateCode,
        nicCode: live.nicCode,
        industrialClassification: live.industrialClassification,
      }),
      notes: "Retrieved in real time from Ministry of Corporate Affairs (data.gov.in MCA21 API)",
    },
  });

  // Update BusinessProfile
  const updates: Record<string, unknown> = {
    cin: live.cin,
    registeredAddr: live.registeredAddress,
    sourceStatus: "VERIFIED",
  };

  if (live.industrialClassification) {
    updates.primaryActivity = live.industrialClassification;
  }
  if (live.nicCode) {
    updates.industryCode = live.nicCode;
  }
  if (live.companyClass) {
    updates.enterpriseType = live.companyClass;
  }
  if (live.incorporationDate) {
    const incDate = new Date(live.incorporationDate);
    if (!isNaN(incDate.getTime())) {
      updates.incorporatedOn = incDate;
    }
  }

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: updates,
  });

  // Complete verification task
  await prisma.verificationTask.upsert({
    where: { id: `mca-${businessId}` },
    create: {
      id: `mca-${businessId}`,
      businessId,
      taskType: "MCA",
      status: "COMPLETED",
      result: JSON.stringify({
        sourceRecordId: sourceRecord.id,
        sourceStatus: "VERIFIED",
        cin: live.cin,
        status: live.status,
      }),
      completedAt: new Date(),
    },
    update: {
      status: "COMPLETED",
      result: JSON.stringify({
        sourceRecordId: sourceRecord.id,
        sourceStatus: "VERIFIED",
        cin: live.cin,
        status: live.status,
      }),
      completedAt: new Date(),
      error: null,
    },
  });

  // Close any open MCA manual reviews
  await prisma.manualReview.updateMany({
    where: { businessId, reviewType: "MCA_MANUAL", status: "OPEN" },
    data: {
      status: "SUBMITTED",
      submittedData: JSON.stringify(live),
      submittedAt: new Date(),
    },
  });

  await logAuditEvent({
    businessId,
    eventType: "VERIFICATION_COMPLETED",
    actor,
    description: `MCA21 live corporate verification completed for ${live.companyName} (${live.cin})`,
    metadata: {
      cin: live.cin,
      sourceRecordId: sourceRecord.id,
      status: live.status,
      authorizedCapital: live.authorizedCapital,
    },
  });

  return {
    success: true,
    record: live,
    sourceRecordId: sourceRecord.id,
  };
}

export interface McaManualPayload {
  cin?: string;
  companyName?: string;
  registeredAddress?: string;
  incorporationDate?: string;
  status?: string;
  authorisedCapital?: string;
  paidUpCapital?: string;
  directors?: Array<{ din: string; name: string; designation: string }>;
  charges?: string;
  rawText?: string;
}

/**
 * Parse user-submitted MCA data and store it as a BusinessSourceRecord.
 * Returns the created source record ID.
 */
export async function saveMcaManualEntry({
  businessId,
  payload,
  actor,
}: {
  businessId: string;
  payload: McaManualPayload;
  actor?: string;
}): Promise<string> {
  const parsedFields: Record<string, unknown> = { ...payload };

  const record = await prisma.businessSourceRecord.create({
    data: {
      businessId,
      sourceType: "MCA",
      sourceStatus: "USER_PROVIDED",
      rawPayload: JSON.stringify(payload),
      parsedFields: JSON.stringify(parsedFields),
      notes: "Entered by user after manual MCA portal lookup",
    },
  });

  const updates: Record<string, unknown> = {};
  if (payload.cin) updates.cin = payload.cin;
  if (payload.incorporationDate) {
    const d = new Date(payload.incorporationDate);
    if (!isNaN(d.getTime())) updates.incorporatedOn = d;
  }
  if (payload.registeredAddress) updates.registeredAddr = payload.registeredAddress;

  if (Object.keys(updates).length > 0) {
    await prisma.businessProfile.update({
      where: { id: businessId },
      data: updates,
    });
  }

  await prisma.verificationTask.updateMany({
    where: { businessId, taskType: "MCA" },
    data: {
      status: "COMPLETED",
      result: JSON.stringify({ sourceRecordId: record.id, sourceStatus: "USER_PROVIDED" }),
      completedAt: new Date(),
    },
  });

  await prisma.manualReview.updateMany({
    where: { businessId, reviewType: "MCA_MANUAL", status: "OPEN" },
    data: { status: "SUBMITTED", submittedData: JSON.stringify(payload), submittedAt: new Date() },
  });

  await logAuditEvent({
    businessId,
    eventType: "MANUAL_ENTRY_SUBMITTED",
    actor,
    description: "MCA data submitted via manual portal lookup",
    metadata: { sourceRecordId: record.id, cin: payload.cin },
  });

  return record.id;
}

/**
 * Create an MCA verification task.
 * Attempts live automated verification via data.gov.in MCA API first;
 * if not found, falls back gracefully to AWAITING_MANUAL prompt.
 */
export async function initMcaVerification(businessId: string) {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  // 1. Attempt live API lookup if CIN or companyName available
  if (biz.cin || biz.companyName) {
    const syncResult = await syncMcaLiveRecordToBusiness({
      businessId,
      cin: biz.cin,
      companyName: biz.companyName,
      actor: "ORCHESTRATOR_LIVE_MCA",
    });

    if (syncResult.success) {
      return; // Live MCA API verified!
    }
  }

  // 2. Fallback to manual review prompt if not matched in public index
  const portalUrl = getMcaPortalUrl({ cin: biz.cin, companyName: biz.companyName });

  await prisma.verificationTask.upsert({
    where: { id: `mca-${businessId}` },
    create: {
      id: `mca-${businessId}`,
      businessId,
      taskType: "MCA",
      status: "AWAITING_MANUAL",
      startedAt: new Date(),
    },
    update: { status: "AWAITING_MANUAL", startedAt: new Date(), error: null },
  });

  await prisma.manualReview.create({
    data: {
      businessId,
      reviewType: "MCA_MANUAL",
      status: "OPEN",
      promptText: `Open the MCA21 portal to look up "${biz.companyName}" and enter the details below. Look for: CIN, incorporation date, registered address, director list, and current status.`,
      portalUrl,
    },
  });
}
