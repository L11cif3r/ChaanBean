// Case Check (PRD v3.0 section 7; v1.0 5.5 and S12). Shared by the server and the screen.
// The match confidence is worked out here, not taken from the provider, so every provider is judged the same way
// (FR-CC-03): name similarity, the father's or director's name, and where the case is (district and state).

import { z } from "zod";
import { isValidPan, normaliseIdentifier, normaliseMobile } from "@/lib/validators";

export const CC_CODES = ["CC_COURT", "CC_FIR", "CC_AML"] as const;
export type CcCode = (typeof CC_CODES)[number];
export const isCcCode = (code: string): code is CcCode => (CC_CODES as readonly string[]).includes(code);

export type CaseSource = "court" | "fir" | "aml";
export const SOURCE_OF: Record<CcCode, CaseSource> = { CC_COURT: "court", CC_FIR: "fir", CC_AML: "aml" };

/** States whose police records the FIR provider covers (FR-CC-07). Placeholder until the provider confirms its list. */
export const FIR_STATES = ["07", "24", "27", "29", "33", "36"] as const;
export const firCovered = (stateCode: string) => (FIR_STATES as readonly string[]).includes(stateCode);

/** Over this many possible matches, the user is asked for more details first (FR-CC-06). */
export const MAX_MATCHES = 50;

// ---------------------------------------------------------------- search details (S12 fields)

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message);
const optional = z.string().trim().max(120).optional().transform((v) => (v ? v : undefined));

export const caseInputSchema = z
  .object({
    name: text(2, 120, "Enter a name."),
    state: z.string().regex(/^\d{2}$/, "Select a state."),
    district: text(2, 60, "Enter a district."),
    address: text(3, 300, "Enter an address."),
    relativeName: optional,
    pan: optional.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    mobile: optional,
    /** Money laundering check: date of birth or incorporation. */
    birthDate: optional,
  })
  .superRefine((v, ctx) => {
    if (v.relativeName && (v.relativeName.length < 2 || v.relativeName.length > 80)) {
      ctx.addIssue({ code: "custom", path: ["relativeName"], message: "Enter 2 to 80 characters." });
    }
    if (v.pan && !isValidPan(v.pan)) ctx.addIssue({ code: "custom", path: ["pan"], message: "This PAN is not valid." });
    if (v.mobile && !normaliseMobile(v.mobile)) ctx.addIssue({ code: "custom", path: ["mobile"], message: "Enter a valid mobile number." });
    if (v.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Enter a valid date." });
  });

export interface CaseInput {
  name: string;
  state: string;
  district: string;
  address: string;
  relativeName?: string;
  pan?: string;
  mobile?: string;
  birthDate?: string;
}

// ---------------------------------------------------------------- results

/** One possible match as a provider returns it (adapter contract v3 section 16, CC_COURT / CC_FIR / CC_AML). */
export interface CaseCandidate {
  sourceId: string;
  caseNo: string | null;
  /** Court, police station, or the list name for money laundering. */
  court: string;
  caseType: string;
  filedOn: string | null;
  status: string;
  pending: boolean;
  nextHearing: string | null;
  parties: { role: "petitioner" | "respondent" | "accused" | "complainant" | "listed"; name: string }[];
  /** The party who may be the buyer, with what the source knows about them. */
  subject: { name: string; relativeName: string | null; district: string | null; stateCode: string | null; pan: string | null };
  acts: string[];
  /** Cheque bounce, money recovery or insolvency. */
  recovery: boolean;
  listName?: string;
  listDate?: string;
  /** Provider's own score, used only for money laundering lists. */
  providerScore?: number;
  details: Record<string, unknown>;
}

export type Confidence = "high" | "medium" | "low";

const NOISE = new Set(["M/S", "MS", "PVT", "PRIVATE", "LTD", "LIMITED", "LLP", "AND", "&", "CO", "COMPANY", "THE", "SHRI", "SMT", "MR", "MRS"]);

/** Upper case, no punctuation, without company suffixes and honorifics. */
export function nameTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9/& ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t));
}

/** 0 to 1: how much two names agree, token by token. */
export function nameSimilarity(a: string, b: string): number {
  const x = nameTokens(a);
  const y = nameTokens(b);
  if (!x.length || !y.length) return 0;
  if (x.join(" ") === y.join(" ")) return 1;
  const set = new Set(y);
  const shared = x.filter((t) => set.has(t)).length;
  return shared / Math.max(x.length, y.length);
}

/**
 * Score 0 to 100 and confidence for one match (FR-CC-03). Name gives up to 60; the father's or director's name adds
 * 20 when it agrees and takes 20 away when it clearly differs; the same district adds 20, the same state 10, another
 * state takes 10 away. A matching PAN is decisive. Money laundering hits use the list provider's score, kept within
 * what the name similarity allows.
 */
export function scoreMatch(input: Pick<CaseInput, "name" | "relativeName" | "district" | "state" | "pan">, c: CaseCandidate): { score: number; confidence: Confidence } {
  const name = nameSimilarity(input.name, c.subject.name);
  let score: number;
  if (c.providerScore !== undefined) {
    score = Math.round(Math.min(c.providerScore, 40 + name * 60));
  } else {
    score = name * 60;
    if (input.relativeName && c.subject.relativeName) {
      score += nameSimilarity(input.relativeName, c.subject.relativeName) >= 0.5 ? 20 : -20;
    }
    if (c.subject.district && input.district && c.subject.district.trim().toLowerCase() === input.district.trim().toLowerCase()) score += 20;
    else if (c.subject.stateCode && c.subject.stateCode === input.state) score += 10;
    else if (c.subject.stateCode) score -= 10;
  }
  if (input.pan && c.subject.pan) score = c.subject.pan === input.pan ? Math.max(score, 95) : Math.min(score, 30);
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, confidence: score >= 75 ? "high" : score >= 45 ? "medium" : "low" };
}
