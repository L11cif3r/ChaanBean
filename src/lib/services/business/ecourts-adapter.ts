/**
 * eCourts Adapter — V0 Public-Data Mode
 *
 * IMPORTANT: This adapter does NOT bypass CAPTCHA or automate eCourts access.
 * eCourts (ecourts.gov.in) requires CAPTCHA for searches. This adapter:
 *   1. Provides the official eCourts portal URL so the user can search manually
 *   2. Accepts manual entry of court case details
 *   3. Stores with sourceStatus = USER_PROVIDED
 *
 * Future: integrate with authorized eCourts API or PACER-equivalent if made available.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export const ECOURTS_PORTAL_URL = "https://services.ecourts.gov.in/ecourtindiaHC/";
export const ECOURTS_SEARCH_URL = "https://ecourts.gov.in/ecourts_home/";
export const NCLT_PORTAL_URL = "https://nclt.gov.in/";

export function getEcourtsPortalUrl(): string {
  return ECOURTS_SEARCH_URL;
}

export interface CourtCasePayload {
  caseNumber?: string;
  courtName?: string;
  filingDate?: string;
  caseType?: string;   // CIVIL | CRIMINAL | ARBITRATION | WRIT | INSOLVENCY | OTHER
  status?: string;     // PENDING | DISPOSED | ACTIVE | DISMISSED
  partyRole?: string;  // PETITIONER | RESPONDENT | APPELLANT | DEFENDANT
  description?: string;
  notes?: string;
}

export async function saveCourtCaseManualEntry({
  businessId,
  cases,
  actor,
}: {
  businessId: string;
  cases: CourtCasePayload[];
  actor?: string;
}): Promise<string[]> {
  const ids: string[] = [];

  for (const c of cases) {
    const courtCase = await prisma.courtCase.create({
      data: {
        businessId,
        caseNumber: c.caseNumber,
        courtName: c.courtName,
        filingDate: c.filingDate ? new Date(c.filingDate) : undefined,
        caseType: c.caseType,
        status: c.status,
        partyRole: c.partyRole,
        description: c.description,
        sourceStatus: "USER_PROVIDED",
        notes: c.notes,
      },
    });
    ids.push(courtCase.id);
  }

  // Store a source record summarising the lookup
  await prisma.businessSourceRecord.create({
    data: {
      businessId,
      sourceType: "ECOURTS",
      sourceStatus: "USER_PROVIDED",
      rawPayload: JSON.stringify({ cases }),
      parsedFields: JSON.stringify({ caseCount: cases.length }),
      notes: `${cases.length} court case(s) entered by user after manual eCourts search`,
    },
  });

  await prisma.verificationTask.updateMany({
    where: { businessId, taskType: "ECOURTS" },
    data: {
      status: "COMPLETED",
      result: JSON.stringify({ caseCount: cases.length, sourceStatus: "USER_PROVIDED" }),
      completedAt: new Date(),
    },
  });

  await prisma.manualReview.updateMany({
    where: { businessId, reviewType: "ECOURTS_MANUAL", status: "OPEN" },
    data: {
      status: "SUBMITTED",
      submittedData: JSON.stringify({ cases }),
      submittedAt: new Date(),
    },
  });

  await logAuditEvent({
    businessId,
    eventType: "MANUAL_ENTRY_SUBMITTED",
    actor,
    description: `${cases.length} court case(s) submitted via manual eCourts search`,
    metadata: { caseCount: cases.length, caseIds: ids },
  });

  return ids;
}

export async function initEcourtsVerification(businessId: string) {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  await prisma.verificationTask.upsert({
    where: { id: `ecourts-${businessId}` },
    create: {
      id: `ecourts-${businessId}`,
      businessId,
      taskType: "ECOURTS",
      status: "AWAITING_MANUAL",
      startedAt: new Date(),
    },
    update: { status: "AWAITING_MANUAL", startedAt: new Date(), error: null },
  });

  await prisma.manualReview.create({
    data: {
      businessId,
      reviewType: "ECOURTS_MANUAL",
      status: "OPEN",
      promptText: `Open eCourts and search for any cases involving "${biz.companyName}". Search by party name in both District Courts and High Courts. Enter any active or pending cases below. If no cases found, submit with an empty list.`,
      portalUrl: getEcourtsPortalUrl(),
    },
  });
}
