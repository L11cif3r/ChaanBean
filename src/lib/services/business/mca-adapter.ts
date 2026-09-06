/**
 * MCA Adapter — V0 Public-Data Mode
 *
 * There is no free, unauthenticated public JSON API for MCA21.
 * This adapter:
 *   1. Constructs the official MCA21 portal URL so the user can look up the company
 *   2. Provides a manual entry form for the user to paste what they found
 *   3. Stores the result with sourceStatus = USER_PROVIDED
 *
 * Future: swap openMcaPortalUrl() + parseManualPayload() with an
 * authorized API Setu / Karza / Digitap call — the interface is the same.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export const MCA_PORTAL_BASE = "https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do";
export const MCA_SEARCH_URL = "https://efiling.mca.gov.in/eFiling/helperPages/companySearch!search.action";

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

export interface McaManualPayload {
  cin?: string;
  companyName?: string;
  registeredAddress?: string;
  incorporationDate?: string;
  status?: string; // Active | Struck off | Under process of striking off
  authorisedCapital?: string;
  paidUpCapital?: string;
  directors?: Array<{ din: string; name: string; designation: string }>;
  charges?: string;
  rawText?: string; // anything the user wants to paste
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
  // Parse incorporation date if provided
  const parsedFields: Record<string, unknown> = { ...payload };

  // Store source record
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

  // Update BusinessProfile with resolved fields if CIN was provided
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

  // Update verification task
  await prisma.verificationTask.updateMany({
    where: { businessId, taskType: "MCA" },
    data: {
      status: "COMPLETED",
      result: JSON.stringify({ sourceRecordId: record.id, sourceStatus: "USER_PROVIDED" }),
      completedAt: new Date(),
    },
  });

  // Close any open MCA manual review
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

/** Create an MCA verification task and a manual review prompt */
export async function initMcaVerification(businessId: string) {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  const portalUrl = getMcaPortalUrl({ cin: biz.cin, companyName: biz.companyName });

  // Create task
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

  // Create manual review prompt
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
