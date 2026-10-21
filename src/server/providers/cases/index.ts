import "server-only";
import crypto from "node:crypto";
import { firCovered, MAX_MATCHES, nameTokens, type CaseCandidate, type CaseInput, type CcCode } from "@/lib/cases";
import { GST_STATES } from "@/server/providers/identity/states";
import { MOCK, chain, hasLiveProvider } from "@/server/providers/registry";
import { notConnected } from "@/server/providers/slots";
import type { ProviderResult } from "@/server/providers/identity";

// Case Check providers (PRD v3.0 section 17): eCourts through Surepass (court cases), AuthBridge or IDfy (FIR) and
// Signzy (money laundering lists). Only a mock exists until the keys arrive.
//
// Mock scenarios by the name searched:
//   contains "CLEAN"    no records (still charged: the search ran)
//   contains "COMMON"   more than 50 possible matches: the user is asked for more details (not charged)
//   contains "DOWN"     provider not answering (not charged)
//   contains "SANCTION" a money laundering list hit; "PEP" a politically exposed person
//   anything else       a pending cheque bounce case in the same district (strong match), a disposed recovery
//                       suit with a similar name, and a weak match in another state; FIR: one record in covered states.

export interface CaseProvider {
  name: string;
  isMock: boolean;
  run(code: CcCode, input: CaseInput, opts: { today: string }): Promise<ProviderResult<{ matches: CaseCandidate[] }> & { raw: unknown }>;
}

const now = () => new Date().toISOString();
const seed = (s: string) => crypto.createHash("sha256").update(s).digest();
const PROVIDER = "mock_cases";

const ok = (matches: CaseCandidate[]) => ({ status: "success" as const, provider: PROVIDER, fetchedAt: now(), data: { matches }, raw: { mock: true, matches } });
const none = (message: string) => ({ status: "no_data" as const, provider: PROVIDER, fetchedAt: now(), data: { matches: [] }, error: { code: "NO_RECORDS", message }, raw: { mock: true, message } });
const fail = (code: string, message: string, retryable: boolean) => ({
  status: "not_available" as const, provider: PROVIDER, fetchedAt: now(), error: { code, message, retryable }, raw: { mock: true, code },
});

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function court(input: CaseInput, today: string) {
  const tokens = nameTokens(input.name);
  const key = tokens.join(" ");
  if (key.includes("COMMON")) {
    return fail("TOO_MANY_MATCHES", `More than ${MAX_MATCHES} possible matches. Add more details and search again.`, false);
  }
  const s = seed(key);
  const state = GST_STATES[input.state] ?? "Karnataka";
  const otherState = input.state === "27" ? "29" : "27";
  const first = tokens[0] ?? "SHREE";
  const similar = `${tokens.slice(0, 2).join(" ")} & Co`; // a similar name, as a different firm might have
  const year = 2022 + (s[0] % 3);
  const matches: CaseCandidate[] = [
    {
      sourceId: `ec-${s.readUInt32BE(0)}`,
      caseNo: `CC ${1000 + (s[1] % 900)}/${year}`,
      court: `Chief Judicial Magistrate, ${input.district}`,
      caseType: "Cheque bounce (NI Act s.138)",
      filedOn: `${year}-0${1 + (s[2] % 9)}-1${s[3] % 9}`,
      status: "Pending",
      pending: true,
      nextHearing: addDays(today, 12 + (s[4] % 40)),
      parties: [{ role: "complainant", name: "Laxmi Steel Suppliers" }, { role: "accused", name: input.name }],
      subject: { name: input.name, relativeName: input.relativeName ?? null, district: input.district, stateCode: input.state, pan: null },
      acts: ["Negotiable Instruments Act, 1881 s.138"],
      recovery: true,
      details: { advocates: ["R. Nair (complainant)"], hearings: [{ date: addDays(today, -30), purpose: "Appearance" }], orders: [] },
    },
    {
      sourceId: `ec-${s.readUInt32BE(4)}`,
      caseNo: `OS ${200 + (s[5] % 700)}/${year - 2}`,
      court: `Civil Judge (Senior Division), ${state}`,
      caseType: "Money recovery suit",
      filedOn: `${year - 2}-1${s[6] % 3}-0${1 + (s[7] % 8)}`,
      status: "Disposed",
      pending: false,
      nextHearing: null,
      parties: [{ role: "petitioner", name: "Bharat Finance Ltd" }, { role: "respondent", name: similar }],
      subject: { name: similar, relativeName: null, district: null, stateCode: input.state, pan: null },
      acts: ["Code of Civil Procedure, 1908 Order XXXVII"],
      recovery: true,
      details: { disposal: "Decreed", orders: [{ date: `${year - 1}-03-15`, title: "Judgment" }] },
    },
    {
      sourceId: `ec-${s.readUInt32BE(8)}`,
      caseNo: `CR ${3000 + (s[9] % 900)}/${year}`,
      court: `Metropolitan Magistrate, ${GST_STATES[otherState]}`,
      caseType: "Criminal complaint",
      filedOn: `${year}-0${1 + (s[10] % 9)}-2${s[11] % 8}`,
      status: "Pending",
      pending: true,
      nextHearing: addDays(today, 30),
      parties: [{ role: "complainant", name: "State" }, { role: "accused", name: `${first} Kumar` }],
      subject: { name: `${first} Kumar`, relativeName: "Mohan Kumar", district: null, stateCode: otherState, pan: null },
      acts: ["Bharatiya Nyaya Sanhita, 2023 s.318"],
      recovery: false,
      details: {},
    },
  ];
  return ok(matches);
}

function fir(input: CaseInput, today: string) {
  if (!firCovered(input.state)) return fail("STATE_NOT_COVERED", "FIR records for this state are not available.", false);
  const s = seed(`fir:${nameTokens(input.name).join(" ")}`);
  if (s[0] % 2 === 0) return none("No FIR found for the details given.");
  return ok([
    {
      sourceId: `fir-${s.readUInt32BE(1)}`,
      caseNo: `FIR ${100 + (s[5] % 800)}/${today.slice(0, 4)}`,
      court: `${input.district} Police Station`,
      caseType: "Cheating",
      filedOn: addDays(today, -90),
      status: "Under investigation",
      pending: true,
      nextHearing: null,
      parties: [{ role: "complainant", name: "A. Reddy" }, { role: "accused", name: input.name }],
      subject: { name: input.name, relativeName: null, district: input.district, stateCode: input.state, pan: null },
      acts: ["Bharatiya Nyaya Sanhita, 2023 s.318(4)"],
      recovery: false,
      details: {},
    },
  ]);
}

function aml(input: CaseInput) {
  const key = nameTokens(input.name).join(" ");
  const hit = (listName: string, listDate: string, score: number, kind: string): CaseCandidate => ({
    sourceId: `aml-${seed(listName + key).readUInt32BE(0)}`,
    caseNo: null,
    court: listName,
    caseType: kind,
    filedOn: null,
    status: "Listed",
    pending: true,
    nextHearing: null,
    parties: [{ role: "listed", name: input.name }],
    subject: { name: input.name, relativeName: null, district: null, stateCode: null, pan: null },
    acts: [],
    recovery: false,
    listName,
    listDate,
    providerScore: score,
    details: { reason: kind },
  });
  if (key.includes("SANCTION")) return ok([hit("UN Security Council Consolidated List", "2026-10-01", 92, "Sanctions")]);
  if (key.includes("PEP")) return ok([hit("Politically Exposed Persons (India)", "2026-09-15", 68, "Politically exposed person")]);
  return none("No match on sanctions, PEP, enforcement or regulatory lists.");
}

export const mockCaseProvider: CaseProvider = {
  name: PROVIDER,
  isMock: true,
  async run(code, input, { today }) {
    if (nameTokens(input.name).join(" ").includes("DOWN")) return fail("PROVIDER_DOWN", "Source unavailable", true);
    if (nameTokens(input.name).join(" ").includes("CLEAN") && code !== "CC_AML") return none("No records found for the details given.");
    switch (code) {
      case "CC_COURT": return court(input, today);
      case "CC_FIR": return fir(input, today);
      case "CC_AML": return aml(input);
    }
  },
};

// ---------------------------------------------------------------- choosing the provider (registry.ts)

/** Real adapters by provider name. Add one here when it is written (docs/PROVIDERS.md); the rest use a slot. */
const REAL: Record<string, CaseProvider> = {};

const slot = (name: string): CaseProvider => ({ name, isMock: false, run: async (code) => notConnected(name, code) });
const adapter = (name: string) => (name === MOCK ? mockCaseProvider : (REAL[name] ?? slot(name)));

/** The provider for each Case Check item (PROVIDER_CC_COURT, PROVIDER_CC_FIR, PROVIDER_CC_AML), with fallback. */
export function caseProvider(): CaseProvider {
  return {
    name: "router",
    get isMock() {
      return (["CC_COURT", "CC_FIR", "CC_AML"] as const).every((c) => chain(c).every((n) => n === MOCK));
    },
    async run(code, input, opts) {
      let last: Awaited<ReturnType<CaseProvider["run"]>> | null = null;
      for (const name of chain(code)) {
        last = await adapter(name).run(code, input, opts);
        if (last.status === "success" || last.status === "no_data" || last.error?.retryable === false) return last;
      }
      return last!;
    },
  };
}

/** Sample data mode (v4 FR-CC-06): Case Check uses sample data until a live provider is set up for the item. */
export function caseProviderFor(sample: boolean): CaseProvider {
  if (!sample) return caseProvider();
  return {
    name: "sample",
    isMock: true,
    run: (code, input, opts) => (hasLiveProvider(code) ? caseProvider().run(code, input, opts) : mockCaseProvider.run(code, input, opts)),
  };
}
