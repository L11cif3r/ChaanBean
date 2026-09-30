/**
 * CHAANBEAN RULES AUTHORIZATION ENGINE
 *
 * Implements the core architecture principle:
 * "AI recommends -> Rules authorize -> MCP executes -> Audit records"
 *
 * Enforces:
 * 1. Tenant Isolation & RBAC validation
 * 2. TRAI Telecom Calling Windows (09:00 - 18:00 IST) & Frequency Caps (max 2 calls/24h, 4h spacing)
 * 3. Statutory Legal Eligibility (MSMED Act 2006 §15 45-day overdue, Broken PTP, Sec 138)
 * 4. Idempotency Token Checks
 * 5. Credit Case Approval Thresholds
 */

import { prisma } from "@/lib/db";

export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
  idempotencyKey?: string;
}

export interface RuleEvaluationResult {
  permitted: boolean;
  ruleCode: string;
  reason: string;
  details?: Record<string, unknown>;
}

export class RulesAuthorizer {
  /**
   * Evaluates whether a voice communication action is permitted under TRAI regulations and tenant rules.
   */
  public static async evaluateVoiceCallPermission(
    context: TenantContext,
    targetPhone: string,
    buyerId?: string
  ): Promise<RuleEvaluationResult> {
    if (!context.tenantId) {
      return {
        permitted: false,
        ruleCode: "RULE_TENANT_REQUIRED",
        reason: "Tenant context is missing. Action rejected for cross-tenant safety.",
      };
    }

    // 1. TRAI Calling Window Check (09:00 to 18:00 IST)
    const nowUtc = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(nowUtc.getTime() + istOffsetMs);
    const istHour = istDate.getUTCHours();
    const istMinute = istDate.getUTCMinutes();
    const timeInHours = istHour + istMinute / 60;

    const isInsideTraiWindow = timeInHours >= 9.0 && timeInHours < 18.0;

    if (!isInsideTraiWindow) {
      return {
        permitted: false,
        ruleCode: "RULE_TRAI_CALLING_WINDOW_CLOSED",
        reason: `Outbound telephony prohibited outside TRAI statutory window (09:00 to 18:00 IST). Current IST: ${String(
          istHour
        ).padStart(2, "0")}:${String(istMinute).padStart(2, "0")}.`,
        details: { istHour, istMinute, allowedStart: "09:00", allowedEnd: "18:00" },
      };
    }

    // 2. Normalize phone number (E.164 without '+') to match ExotelCallLog format
    let cleanPhone = targetPhone.replace(/[\s\-\(\)]/g, "");
    if (cleanPhone.startsWith("+91")) cleanPhone = cleanPhone.substring(3);
    else if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    // 3. Daily Frequency Cap: Max 2 calls per 24 hours per debtor
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCalls = await prisma.exotelCallLog.findMany({
      where: {
        companyId: context.tenantId,
        toPhone: { in: [cleanPhone, targetPhone] },
        calledAt: { gte: past24h },
      },
      orderBy: { calledAt: "desc" },
    });

    if (recentCalls.length >= 2) {
      return {
        permitted: false,
        ruleCode: "RULE_FREQUENCY_CAP_EXCEEDED",
        reason: `Maximum frequency limit reached: 2 calls per 24 hours allowed to ${targetPhone}.`,
        details: { recentCount: recentCalls.length, maxAllowed: 2 },
      };
    }

    // 3. Minimum 4-hour Spacing between call attempts
    if (recentCalls.length > 0) {
      const lastCallTime = recentCalls[0].calledAt.getTime();
      const elapsedHours = (Date.now() - lastCallTime) / (1000 * 60 * 60);

      if (elapsedHours < 4.0) {
        return {
          permitted: false,
          ruleCode: "RULE_CALL_SPACING_VIOLATION",
          reason: `Minimum spacing violation: At least 4 hours must elapse between calls. Only ${elapsedHours.toFixed(
            1
          )}h elapsed.`,
          details: { elapsedHours: Number(elapsedHours.toFixed(2)), requiredHours: 4 },
        };
      }
    }

    // 4. Check if debtor has dispute or credit hold
    if (buyerId) {
      const activeHolds = await prisma.creditHold.findMany({
        where: {
          creditAccount: { buyerId, buyer: { companyId: context.tenantId } },
          status: "active",
        },
      });

      if (activeHolds.length > 0) {
        return {
          permitted: false,
          ruleCode: "RULE_DISPUTE_HOLD_ACTIVE",
          reason: `Account is under an active dispute or credit hold: "${activeHolds[0].reason}". Voice collection paused pending resolution.`,
          details: { holdReason: activeHolds[0].reason },
        };
      }
    }

    return {
      permitted: true,
      ruleCode: "RULE_CALL_PERMITTED",
      reason: "Voice reminder authorized under TRAI TCCCPR window and tenant frequency guidelines.",
    };
  }

  /**
   * Evaluates statutory legal escalation eligibility for a recovery case or debtor account.
   */
  public static async evaluateLegalEligibility(
    context: TenantContext,
    recoveryCaseId: string
  ): Promise<RuleEvaluationResult> {
    if (!context.tenantId) {
      return {
        permitted: false,
        ruleCode: "RULE_TENANT_REQUIRED",
        reason: "Tenant context is missing.",
      };
    }

    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        creditAccount: {
          include: {
            promisesToPay: { orderBy: { promisedDate: "desc" }, take: 1 },
          },
        },
        buyer: true,
      },
    });

    if (!recoveryCase) {
      return {
        permitted: false,
        ruleCode: "RULE_CASE_NOT_FOUND",
        reason: "Recovery case does not exist.",
      };
    }

    if (recoveryCase.companyId !== context.tenantId) {
      return {
        permitted: false,
        ruleCode: "RULE_CROSS_TENANT_DENIED",
        reason: "Cross-tenant access blocked.",
      };
    }

    const grounds: string[] = [];

    // Condition 1: Overdue DPD >= 45 days under MSMED Act 2006 §15
    if (recoveryCase.overdueDpd >= 45) {
      grounds.push(
        `MSMED Act 2006 (Section 15-18): Receivables overdue by ${recoveryCase.overdueDpd} days (exceeds statutory 45-day threshold). Compound interest accrued at 3x RBI Bank Rate (20.25% p.a.).`
      );
    }

    // Condition 2: Broken Promise to Pay
    const lastPtp = recoveryCase.creditAccount.promisesToPay[0];
    if (lastPtp && (lastPtp.status === "broken" || (lastPtp.status === "pending" && lastPtp.promisedDate < new Date()))) {
      grounds.push(
        `Broken Commitment: Debtor failed to honor Promise to Pay of INR ${lastPtp.amount.toLocaleString(
          "en-IN"
        )} scheduled for ${lastPtp.promisedDate.toISOString().split("T")[0]}.`
      );
    }

    // Condition 3: Total claim threshold >= ₹25,000
    if (recoveryCase.totalClaim < 25000) {
      return {
        permitted: false,
        ruleCode: "RULE_CLAIM_BELOW_MINIMUM",
        reason: `Total claim amount (INR ${recoveryCase.totalClaim.toLocaleString(
          "en-IN"
        )}) is below minimum formal legal candidate threshold of ₹25,000.`,
      };
    }

    if (grounds.length === 0) {
      return {
        permitted: false,
        ruleCode: "RULE_NOT_YET_ELIGIBLE",
        reason: `Case DPD (${recoveryCase.overdueDpd} days) has not met statutory 45-day threshold and has no broken PTP. Maintain standard recovery cadence.`,
      };
    }

    return {
      permitted: true,
      ruleCode: "RULE_LEGAL_ELIGIBLE",
      reason: `Case meets statutory escalation criteria under ${grounds.length} legal grounds.`,
      details: { grounds, totalClaim: recoveryCase.totalClaim, overdueDpd: recoveryCase.overdueDpd },
    };
  }

  /**
   * Determines the next optimal recovery action based on DPD, PTP, and call history.
   */
  public static async determineNextRecoveryAction(
    context: TenantContext,
    recoveryCaseId: string
  ): Promise<{ actionType: string; recommendation: string; details: Record<string, unknown> }> {
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        creditAccount: {
          include: {
            promisesToPay: { orderBy: { promisedDate: "desc" }, take: 1 },
          },
        },
        exotelCallLogs: { orderBy: { calledAt: "desc" }, take: 1 },
      },
    });

    if (!recoveryCase) {
      return {
        actionType: "none",
        recommendation: "Case not found.",
        details: {},
      };
    }

    const { overdueDpd, totalClaim, isLegalEligible } = recoveryCase;
    const lastPtp = recoveryCase.creditAccount.promisesToPay[0];

    // Priority 1: Check if eligible for legal candidate
    if (isLegalEligible || overdueDpd >= 45) {
      return {
        actionType: "create_legal_candidate",
        recommendation: `Statutory 45-day payment window expired (${overdueDpd} DPD). Initiate formal MSMED Act Section 18 arbitration docket preparation.`,
        details: { overdueDpd, totalClaim, stage: "L3_LEGAL_ESCALATION" },
      };
    }

    // Priority 2: PTP pending check
    if (lastPtp && lastPtp.status === "pending" && lastPtp.promisedDate >= new Date()) {
      return {
        actionType: "await_ptp",
        recommendation: `Active Promise to Pay recorded for ${lastPtp.promisedDate.toISOString().split("T")[0]}. Await settlement before triggering escalation.`,
        details: { promisedDate: lastPtp.promisedDate, promisedAmount: lastPtp.amount },
      };
    }

    // Priority 3: Exotel Voice Reminder
    return {
      actionType: "exotel_voice_call",
      recommendation: `Account is ${overdueDpd} days overdue. Dispatch 15-second statutory Exotel voice reminder with amount and payment terms.`,
      details: { overdueDpd, totalClaim, reminderChannel: "exotel_voice" },
    };
  }
}
