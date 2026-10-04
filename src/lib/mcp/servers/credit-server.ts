/**
 * CREDIT DOMAIN MCP SERVER
 *
 * Implements priority tools:
 * 1. get_credit_report
 * 2. calculate_credit_risk
 * 3. get_risk_explanation
 * 4. get_missing_information
 */

import { McpContext, McpToolDefinition, McpToolHandler } from "../types";
import { CreditRiskCalculator, CreditAssessmentInputs } from "@/lib/credit-engine/risk-calculator";
import { CreditRiskExplainer } from "@/lib/credit-engine/risk-explainer";
import { KNOWLEDGE_COMPANIES } from "@/lib/knowledge-source/companies";

export const CREDIT_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "get_credit_report",
    domain: "credit",
    description: "Retrieves complete commercial credit risk dossier for a target entity.",
    parameters: {
      identifier: { type: "string", description: "Company identifier.", required: true },
    },
  },
  {
    name: "calculate_credit_risk",
    domain: "credit",
    description: "Executes the deterministic 6-factor credit risk engine.",
    parameters: {
      companyName: { type: "string", description: "Target company name.", required: true },
      requestedExposure: { type: "number", description: "Desired credit exposure in INR.", required: false },
      cin: { type: "string", description: "CIN if known.", required: false },
      gstin: { type: "string", description: "GSTIN if known.", required: false },
    },
  },
  {
    name: "get_risk_explanation",
    domain: "credit",
    description: "Generates an executive textual narrative explaining deterministic credit factors without altering scores.",
    parameters: {
      companyName: { type: "string", description: "Target company name.", required: true },
      compositeScore: { type: "number", description: "Calculated score.", required: true },
      riskBand: { type: "string", description: "Calculated risk band.", required: true },
    },
  },
  {
    name: "get_missing_information",
    domain: "credit",
    description: "Identifies data gaps and missing statutory filings for higher credit limit unlocking.",
    parameters: {
      identifier: { type: "string", description: "Target company identifier.", required: true },
    },
  },
];

export const CREDIT_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  calculate_credit_risk: async (args, _context: McpContext) => {
    const q = String(args.companyName || "").toLowerCase();
    const matched = KNOWLEDGE_COMPANIES.find(
      (c) =>
        c.legalName.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q) ||
        c.cin.toLowerCase() === q
    );

    const latestFin = matched?.yearFinancials?.[0];
    const inputs: CreditAssessmentInputs = {
      companyName: matched?.legalName || args.companyName || "Target Company Pvt Ltd",
      cin: matched?.cin || args.cin,
      gstin: matched?.gstin || args.gstin,
      pan: matched?.pan,
      incorporationYear: matched?.incorporatedOn ? parseInt(matched.incorporatedOn.split("-")[0], 10) : 2020,
      annualTurnover: latestFin?.revenue || 45000000,
      ebitdaMarginPct: latestFin && latestFin.revenue ? (latestFin.ebitda / latestFin.revenue) * 100 : 12.0,
      currentRatio: latestFin?.currentRatio || 1.35,
      debtToEquity: latestFin?.debtToEquity || 1.2,
      onTimePaymentRatio: matched?.riskFlag === "GREEN" ? 0.94 : matched?.riskFlag === "AMBER" ? 0.78 : 0.45,
      averageDsoDays: matched ? 30 + (matched.daysBeyondTerms || 0) : 38,
      reportedDefaultsCount: matched?.riskFlag === "RED" ? 2 : 0,
      openChargesCount: 1,
      isUdyamRegistered: Boolean(matched?.udyamNo),
      activeDirectorsCount: matched?.directors?.length || 3,
      hasDirectorDisqualification: matched?.directors?.some((d) => d.dinStatus === "DISQUALIFIED") || false,
      courtCasesCount: matched?.courtCases?.length || 0,
      hasSection138ChequeBounce: matched?.courtCases?.some((c) => c.caseType.includes("138")) || false,
      requestedExposure: Number(args.requestedExposure) || 5000000,
    };

    const result = CreditRiskCalculator.calculate(inputs);
    return result;
  },

  get_risk_explanation: async (args, _context: McpContext) => {
    const calcResult = CreditRiskCalculator.calculate({
      companyName: String(args.companyName || "Target Company"),
      requestedExposure: 5000000,
    });

    const explanation = await CreditRiskExplainer.generateExplanation(calcResult);
    return {
      companyName: calcResult.companyName,
      compositeScore: calcResult.compositeScore,
      riskBand: calcResult.riskBand,
      explanation,
    };
  },

  get_credit_report: async (args, context: McpContext) => {
    const calc = await CREDIT_TOOL_HANDLERS.calculate_credit_risk(
      { companyName: args.identifier },
      context
    );
    const explanation = await CreditRiskExplainer.generateExplanation(calc as any);

    return {
      ...(calc as any),
      aiExecutiveSummary: explanation,
    };
  },

  get_missing_information: async (args, _context: McpContext) => {
    const q = String(args.identifier || "").toLowerCase();
    const matched = KNOWLEDGE_COMPANIES.find(
      (c) =>
        c.legalName.toLowerCase().includes(q) ||
        c.tradeName.toLowerCase().includes(q)
    );

    const gaps: string[] = [];
    if (!matched?.udyamNo) gaps.push("Audited Udyam MSME Certificate");
    if (!matched?.yearFinancials || matched.yearFinancials.length < 3) {
      gaps.push("3-Year Audited Balance Sheet & Profit & Loss Statement");
    }
    gaps.push("Bank Statement Penny Drop / IMPS Verification");
    gaps.push("GST Inward/Outward Monthly Reconciliation (GSTR-2B vs GSTR-3B)");

    return {
      companyName: matched?.legalName || args.identifier,
      missingItemsCount: gaps.length,
      missingItems: gaps,
      potentialLimitUpside: "Unlocks up to 25% higher credit limit upon submission.",
    };
  },
};
