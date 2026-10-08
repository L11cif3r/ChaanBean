import { describe, expect, it } from "vitest";
import { createDataGovProviders, mapEntityType, mapStatus, parseDate, recordToMaster } from "../providers/datagov";

const SAMPLE = {
  CIN: "U51909MH2012PTC123456",
  CompanyName: "SHARMA BUILDERS PRIVATE LIMITED",
  CompanyROCcode: "RoC-Mumbai",
  CompanyCategory: "Company limited by Shares",
  CompanySubCategory: "Non-govt company",
  CompanyClass: "Private",
  AuthorizedCapital: "10000000",
  PaidupCapital: "2500000",
  CompanyRegistrationdate_date: "2017-04-12",
  Registered_Office_Address: "12 Example Road, Andheri East, Mumbai 400069",
  Listingstatus: "Unlisted",
  CompanyStatus: "Active",
  CompanyStateCode: "Maharashtra",
};

function fakeFetch(handler: (url: URL) => { status?: number; body?: unknown; throws?: Error }) {
  const calls: URL[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url);
    const r = handler(url);
    if (r.throws) throw r.throws;
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { impl, calls };
}

describe("data.gov.in mapping", () => {
  it("maps a company record without inventing anything", () => {
    const m = recordToMaster(SAMPLE)!;
    expect(m).toMatchObject({
      cin: "U51909MH2012PTC123456",
      legalName: "SHARMA BUILDERS PRIVATE LIMITED",
      entityType: "PRIVATE_LTD",
      companyStatus: "ACTIVE",
      rocCode: "RoC-Mumbai",
      incorporationDate: "2017-04-12",
      authorisedCapitalPaise: 1_00_00_000_00n,
      paidUpCapitalPaise: 25_00_000_00n,
    });
    expect(m.registeredAddress?.line1).toContain("Andheri");
    expect(recordToMaster({ ...SAMPLE, AuthorizedCapital: "" })!.authorisedCapitalPaise).toBeUndefined();
  });

  it("maps statuses and dates", () => {
    expect(mapStatus("Strike Off")).toBe("STRIKE_OFF");
    expect(mapStatus("Under Process of Striking Off")).toBe("UNDER_PROCESS_OF_STRIKE_OFF");
    expect(mapStatus("Under Liquidation")).toBe("UNDER_LIQUIDATION");
    expect(mapStatus("Amalgamated")).toBe("AMALGAMATED");
    expect(mapStatus("Something new")).toBe("OTHER");
    expect(parseDate("12-04-2017")).toBe("2017-04-12");
    expect(parseDate("12/04/2017")).toBe("2017-04-12");
    expect(parseDate("")).toBeUndefined();
    expect(mapEntityType(undefined, "L85110KA1981PLC013115")).toBe("PUBLIC_LTD");
  });
});

describe("data.gov.in adapter", () => {
  it("looks a company up by CIN", async () => {
    const f = fakeFetch(() => ({ body: { status: "ok", records: [SAMPLE] } }));
    const p = createDataGovProviders({ apiKey: "test-key", fetchImpl: f.impl });
    const r = await p.mca.getCompanyMaster({ cin: SAMPLE.CIN });
    expect(r.outcome).toBe("SUCCESS");
    expect(f.calls[0].searchParams.get("filters[CIN]")).toBe(SAMPLE.CIN);
  });

  it("rejects a response for a different company", async () => {
    const f = fakeFetch(() => ({ body: { status: "ok", records: [{ ...SAMPLE, CIN: "U51909MH2012PTC999999" }] } }));
    const r = await createDataGovProviders({ apiKey: "k", fetchImpl: f.impl }).mca.getCompanyMaster({ cin: SAMPLE.CIN });
    expect(r.outcome).toBe("ERROR");
  });

  it("tries common legal-name endings because filters are exact", async () => {
    const f = fakeFetch((u) =>
      u.searchParams.get("filters[CompanyName]") === "SHARMA BUILDERS PRIVATE LIMITED"
        ? { body: { status: "ok", records: [SAMPLE] } }
        : { body: { status: "ok", records: [] } },
    );
    const r = await createDataGovProviders({ apiKey: "k", fetchImpl: f.impl }).search.searchByName("Sharma Builders");
    expect(r.outcome).toBe("SUCCESS");
    if (r.outcome === "SUCCESS") expect(r.data[0]).toMatchObject({ cin: SAMPLE.CIN, source: "datagov_mca" });
    expect(f.calls.map((c) => c.searchParams.get("filters[CompanyName]"))).toEqual(["SHARMA BUILDERS", "SHARMA BUILDERS PRIVATE LIMITED"]);
  });

  it("reports NOT_FOUND when nothing matches, and never offers directors or charges", async () => {
    const f = fakeFetch(() => ({ body: { status: "ok", records: [] } }));
    const p = createDataGovProviders({ apiKey: "k", fetchImpl: f.impl });
    expect((await p.search.searchByName("Nothing Like This")).outcome).toBe("NOT_FOUND");
    expect((await p.mca.getDirectors({ cin: SAMPLE.CIN })).outcome).toBe("NOT_FOUND");
    expect((await p.mca.getCharges({ cin: SAMPLE.CIN })).outcome).toBe("NOT_FOUND");
  });

  it("maps a bad key, rate limit and network failure without leaking the key", async () => {
    const bad = fakeFetch(() => ({ body: { status: "error", message: "Invalid API key" } }));
    expect((await createDataGovProviders({ apiKey: "secret-123", fetchImpl: bad.impl }).mca.getCompanyMaster({ cin: SAMPLE.CIN })).outcome).toBe("AUTH_ERROR");
    const limited = fakeFetch(() => ({ status: 429 }));
    expect((await createDataGovProviders({ apiKey: "k", fetchImpl: limited.impl }).mca.getCompanyMaster({ cin: SAMPLE.CIN })).outcome).toBe("RATE_LIMITED");
    const down = fakeFetch(() => ({ throws: new Error("connect ECONNREFUSED https://api.data.gov.in/resource/x?api-key=secret-123") }));
    const r = await createDataGovProviders({ apiKey: "secret-123", fetchImpl: down.impl }).mca.getCompanyMaster({ cin: SAMPLE.CIN });
    expect(r.outcome).toBe("ERROR");
    expect(JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("secret-123");
  });

  it("returns AUTH_ERROR without calling out when no key is configured", async () => {
    const f = fakeFetch(() => ({ body: {} }));
    const r = await createDataGovProviders({ apiKey: "", fetchImpl: f.impl }).mca.getCompanyMaster({ cin: SAMPLE.CIN });
    expect(r.outcome).toBe("AUTH_ERROR");
    expect(f.calls).toHaveLength(0);
  });
});
