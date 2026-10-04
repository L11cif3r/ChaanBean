/**
 * Udyam/MSME Adapter — V0 Public-Data Mode
 *
 * Official Udyam Registration Portal (udyamregistration.gov.in) and
 * Udyam Assist Platform (udyamassist.gov.in) provide public verification
 * of Udyam numbers. No authenticated API is needed for basic status lookup.
 *
 * This adapter:
 *   1. Builds the official Udyam portal verification URL
 *   2. Accepts manual entry of enterprise details
 *   3. Stores with sourceStatus = USER_PROVIDED
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export const UDYAM_PORTAL_URL = "https://udyamregistration.gov.in/UdyamRegistration.aspx";
export const UDYAM_VERIFY_URL = "https://udyamregistration.gov.in/UdyamVerifyRegistration/UdyamVerifyRegistration.aspx";

export function getUdyamPortalUrl(): string {
  return UDYAM_VERIFY_URL;
}

export interface UdyamManualPayload {
  udyamNo?: string;          // UDYAM-XX-00-0000000
  enterpriseName?: string;
  ownerName?: string;
  type?: string;             // MICRO | SMALL | MEDIUM
  activity?: string;         // Manufacturing | Service | Trading
  nic?: string;              // NIC code
  registrationDate?: string;
  district?: string;
  state?: string;
  validUpto?: string;
  rawText?: string;
}

export async function saveUdyamManualEntry({
  businessId,
  payload,
  actor,
}: {
  businessId: string;
  payload: UdyamManualPayload;
  actor?: string;
}): Promise<string> {
  const record = await prisma.businessSourceRecord.create({
    data: {
      businessId,
      sourceType: "UDYAM",
      sourceStatus: "USER_PROVIDED",
      rawPayload: JSON.stringify(payload),
      parsedFields: JSON.stringify(payload),
      notes: "Entered by user after manual Udyam portal verification",
    },
  });

  const updates: Record<string, unknown> = {};
  if (payload.udyamNo) updates.udyamNo = payload.udyamNo;
  if (payload.type) updates.enterpriseType = payload.type;
  if (payload.activity) updates.primaryActivity = payload.activity;

  if (Object.keys(updates).length > 0) {
    await prisma.businessProfile.update({ where: { id: businessId }, data: updates });
  }

  await prisma.verificationTask.updateMany({
    where: { businessId, taskType: "UDYAM" },
    data: {
      status: "COMPLETED",
      result: JSON.stringify({ sourceRecordId: record.id, sourceStatus: "USER_PROVIDED" }),
      completedAt: new Date(),
    },
  });

  await prisma.manualReview.updateMany({
    where: { businessId, reviewType: "UDYAM_MANUAL", status: "OPEN" },
    data: { status: "SUBMITTED", submittedData: JSON.stringify(payload), submittedAt: new Date() },
  });

  await logAuditEvent({
    businessId,
    eventType: "MANUAL_ENTRY_SUBMITTED",
    actor,
    description: "Udyam/MSME data submitted via manual portal verification",
    metadata: { sourceRecordId: record.id, udyamNo: payload.udyamNo },
  });

  return record.id;
}

export async function initUdyamVerification(businessId: string) {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  await prisma.verificationTask.upsert({
    where: { id: `udyam-${businessId}` },
    create: {
      id: `udyam-${businessId}`,
      businessId,
      taskType: "UDYAM",
      status: "AWAITING_MANUAL",
      startedAt: new Date(),
    },
    update: { status: "AWAITING_MANUAL", startedAt: new Date(), error: null },
  });

  await prisma.manualReview.create({
    data: {
      businessId,
      reviewType: "UDYAM_MANUAL",
      status: "OPEN",
      promptText: `Open the Udyam Registration Portal and verify Udyam Number "${biz.udyamNo || "(enter Udyam No.)"}". Enter the enterprise type (Micro/Small/Medium), NIC activity, registration date, and status below.`,
      portalUrl: getUdyamPortalUrl(),
    },
  });
}
