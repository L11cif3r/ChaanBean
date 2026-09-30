/**
 * ChaanBean Developer Event Model (Section 23 of Implementation Blueprint)
 * Auditable events for all key user, agent, wallet, and risk actions.
 */

export type ChaanBeanEventType =
  | "COMPANY_SEARCHED"
  | "ENTITY_CONFIRMED"
  | "REPORT_SELECTED"
  | "WALLET_CONSENT_GIVEN"
  | "WALLET_DEBITED"
  | "REPORT_READY"
  | "REPORT_DOWNLOADED"
  | "CREDIT_EXPOSURE_CREATED"
  | "RISK_ALERT_CREATED"
  | "COLLECTION_STARTED"
  | "PAYMENT_RECEIVED"
  | "LEGAL_ESCALATED"
  | "RECOMMENDATION_SHOWN"
  | "RECOMMENDATION_ACCEPTED_DECLINED"
  | "FEEDBACK_SUBMITTED";

export interface AuditEventPayload {
  eventType: ChaanBeanEventType;
  userId?: string;
  companyId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// In-memory ring buffer for live auditing and inspection
const EVENT_HISTORY: Array<AuditEventPayload & { id: string; recordedAt: string }> = [];
const MAX_HISTORY = 200;

export async function logAuditEvent(
  eventType: ChaanBeanEventType,
  data: {
    userId?: string;
    companyId?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  } = {}
) {
  const { userId, companyId, metadata, ...rest } = data;
  const eventRecord = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventType,
    userId: userId || "usr_active_admin",
    companyId: companyId || "comp_acme_traders",
    metadata: { ...(metadata || {}), ...rest },
    recordedAt: new Date().toISOString(),
  };

  EVENT_HISTORY.unshift(eventRecord);
  if (EVENT_HISTORY.length > MAX_HISTORY) {
    EVENT_HISTORY.pop();
  }

  // Also dispatch browser custom event if in client runtime
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("chaanbean:audit-event", { detail: eventRecord })
    );
  }

  return eventRecord;
}

export function getRecentAuditEvents(limit = 50, filterType?: ChaanBeanEventType) {
  if (filterType) {
    return EVENT_HISTORY.filter((e) => e.eventType === filterType).slice(0, limit);
  }
  return EVENT_HISTORY.slice(0, limit);
}
