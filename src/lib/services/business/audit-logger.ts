import { prisma } from "@/lib/db";

export type AuditEventType =
  | "PROFILE_CREATED"
  | "DOCUMENT_UPLOADED"
  | "VERIFICATION_STARTED"
  | "VERIFICATION_COMPLETED"
  | "RISK_COMPUTED"
  | "CREDIT_COMPUTED"
  | "MANUAL_ENTRY_SUBMITTED"
  | "SOURCE_RECORD_ADDED"
  | "DOCUMENT_PROCESSED"
  | "CONSISTENCY_CHECKED"
  | "PROFILE_UPDATED";

export async function logAuditEvent({
  businessId,
  eventType,
  actor = "system",
  description,
  metadata,
}: {
  businessId: string;
  eventType: AuditEventType;
  actor?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.bizAuditLog.create({
    data: {
      businessId,
      eventType,
      actor,
      description,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}
