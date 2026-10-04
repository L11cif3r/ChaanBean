/**
 * GST Adapter — V0 Public-Data Mode
 *
 * The official GST portal (gst.gov.in) allows public lookup of a GSTIN
 * without any API credentials. This adapter:
 *   1. Builds the official GST portal search URL
 *   2. Accepts user-pasted GST details (name, status, registration date, type)
 *   3. Stores with sourceStatus = USER_PROVIDED
 *   NOTE: GST turnover data is NOT available via public lookup.
 *         Users must upload GST Return (GSTR-3B) documents for turnover data.
 *
 * Future: swap with authorized API Setu / Karza GST verification endpoint.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export const GST_PORTAL_SEARCH_URL = "https://services.gst.gov.in/services/searchtp";

export function getGstPortalUrl(gstin?: string | null): string {
  return GST_PORTAL_SEARCH_URL;
}

export interface GstManualPayload {
  gstin?: string;
  tradeName?: string;
  legalName?: string;
  registrationDate?: string;
  taxPayerType?: string; // Regular | Composition | SEZ | etc.
  gstStatus?: string;   // Active | Cancelled | Suspended
  stateCode?: string;
  principalAddress?: string;
  additionalAddress?: string;
  natureOfBusiness?: string[];
  rawText?: string;
}

export async function saveGstManualEntry({
  businessId,
  payload,
  actor,
}: {
  businessId: string;
  payload: GstManualPayload;
  actor?: string;
}): Promise<string> {
  const record = await prisma.businessSourceRecord.create({
    data: {
      businessId,
      sourceType: "GST",
      sourceStatus: "USER_PROVIDED",
      rawPayload: JSON.stringify(payload),
      parsedFields: JSON.stringify(payload),
      notes: "Entered by user after manual GST portal lookup",
    },
  });

  // Update BusinessProfile if GSTIN confirmed
  const updates: Record<string, unknown> = {};
  if (payload.gstin) updates.gstin = payload.gstin;

  if (Object.keys(updates).length > 0) {
    await prisma.businessProfile.update({
      where: { id: businessId },
      data: updates,
    });
  }

  await prisma.verificationTask.updateMany({
    where: { businessId, taskType: "GST" },
    data: {
      status: "COMPLETED",
      result: JSON.stringify({ sourceRecordId: record.id, sourceStatus: "USER_PROVIDED" }),
      completedAt: new Date(),
    },
  });

  await prisma.manualReview.updateMany({
    where: { businessId, reviewType: "GST_MANUAL", status: "OPEN" },
    data: { status: "SUBMITTED", submittedData: JSON.stringify(payload), submittedAt: new Date() },
  });

  await logAuditEvent({
    businessId,
    eventType: "MANUAL_ENTRY_SUBMITTED",
    actor,
    description: "GST data submitted via manual portal lookup",
    metadata: { sourceRecordId: record.id, gstin: payload.gstin },
  });

  return record.id;
}

export async function initGstVerification(businessId: string) {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  await prisma.verificationTask.upsert({
    where: { id: `gst-${businessId}` },
    create: {
      id: `gst-${businessId}`,
      businessId,
      taskType: "GST",
      status: "AWAITING_MANUAL",
      startedAt: new Date(),
    },
    update: { status: "AWAITING_MANUAL", startedAt: new Date(), error: null },
  });

  await prisma.manualReview.create({
    data: {
      businessId,
      reviewType: "GST_MANUAL",
      status: "OPEN",
      promptText: `Open the GST Portal and search for GSTIN "${biz.gstin || "(enter GSTIN)"}". Enter the registration status, trade name, registration date, and taxpayer type below. NOTE: Turnover data is not available via public lookup — please upload GSTR-3B documents in the Documents section.`,
      portalUrl: getGstPortalUrl(biz.gstin),
    },
  });
}
