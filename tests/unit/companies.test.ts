import { describe, expect, it } from "vitest";
import { normaliseName, splitAddress, toRecord } from "@/server/providers/mca";
import { mapTaxpayer, mapTaxpayerV1 } from "@/server/providers/identity/apisetu";
import { sourceLine } from "@/lib/checks";
import { detectQuery } from "@/server/companies/search";

// PRD v4.0 section 4: company search by name, GSTIN or CIN/LLPIN over MCA open data and API Setu.
describe("company search", () => {
  it("tells a GSTIN, CIN, LLPIN and name apart (FR-SR-01)", () => {
    expect(detectQuery(" 29aapfq4691f2zl ").kind).toBe("gstin");
    expect(detectQuery("U52609KA2022PTC158514")).toEqual({ kind: "cin", value: "U52609KA2022PTC158514" });
    expect(detectQuery("act-1315")).toEqual({ kind: "cin", value: "ACT-1315" });
    expect(detectQuery("Tata Steel")).toEqual({ kind: "name", value: "tata steel" });
    expect(detectQuery("ab").kind).toBe("short");
  });

  it("normalises names for matching", () => {
    expect(normaliseName("M/s. Om Builders & Developers  Pvt. Ltd.")).toBe("m s om builders and developers pvt ltd");
  });

  it("reads both address endings in the MCA dataset", () => {
    expect(splitAddress("601 Lotus,Goregaon East,Mumbai,Maharashtra,India-400063")).toEqual({ city: "Mumbai", pincode: "400063" });
    expect(splitAddress("238/B, MG KOPPAL,Mysore,Mysore,Karnataka,570016-India")).toEqual({ city: "Mysore", pincode: "570016" });
    expect(splitAddress(null)).toEqual({ city: null, pincode: null });
  });

  it("maps an MCA row, with capital in paise", () => {
    const r = toRecord({
      CIN: "u24129ka2006ptc039063", CompanyName: "N.JAGADISH AGRO FARMS PRIVATE LIMITED", CompanyStatus: "Active", CompanyStateCode: "Karnataka",
      Registered_Office_Address: "120/47 7TH MAIN,BANGALORE,Karnataka,560082-India", CompanyRegistrationdate_date: "2006-04-21",
      AuthorizedCapital: "1000000", PaidupCapital: "NA", Listingstatus: "Unlisted", CompanySubCategory: "Non-government company",
      "CompanyIndian/Foreign Company": "India", nic_code: "NA",
    });
    expect(r).toMatchObject({ listing: "Unlisted", subCategory: "Non-government company", origin: "India", nicCode: null });
    expect(r).toMatchObject({ cin: "U24129KA2006PTC039063", state: "karnataka", city: "BANGALORE", pincode: "560082", authorisedCapitalPaise: 100_000_000, paidupCapitalPaise: null });
    expect(toRecord({ CIN: "", CompanyName: "X" })).toBeNull();
  });

  it("maps the API Setu GSTN v2 answer", () => {
    const d = mapTaxpayer("29AAPFQ4691F2ZL", {
      legalNameOfBusiness: "OM BUILDERS", tradeName: "Om", gstnStatus: "Cancelled", dateOfRegistration: "01/07/2017", dateOfCancellation: "15/03/2024",
      constitutionOfBusiness: "Partnership", taxpayerType: "Regular",
      principalPlaceOfBusinessFields: { principalPlaceOfBusinessAddress: { buildingNumber: "12", streetName: "MG Road", districtName: "Bengaluru Urban", stateName: "Karnataka", pincode: "560001" } },
    });
    expect(d).toMatchObject({ legalName: "OM BUILDERS", status: "Cancelled", registrationDate: "2017-07-01", statusDate: "2024-03-15", stateCode: "29" });
    expect(d.address).toEqual({ line: "12, MG Road", city: "Bengaluru Urban", state: "Karnataka", pincode: "560001" });
  });

  it("keeps the API Setu extras and reads Tax Payer V1 when V2 is down", () => {
    const d = mapTaxpayer("27AAACR5055K1Z7", {
      legalNameOfBusiness: "RELIANCE", gstnStatus: "Active", natureOfBusinessActivity: ["Factory / Manufacturing", "Export"], eInvoiceStatus: "Yes",
      additionalPlaceOfBusinessFields: [{}, {}], stateJurisdiction: "URAN_701", centerJurisdiction: "RANGE-IV",
    });
    expect(d).toMatchObject({ natureOfBusiness: ["Factory / Manufacturing", "Export"], eInvoice: true, otherPlaces: 2, jurisdiction: "URAN_701 · RANGE-IV" });
    const v1 = mapTaxpayerV1("27AAACR5055K1Z7", { legalName: "RELIANCE", status: "Active", registrationDate: "01/07/2017", constitution: "Public Limited Company" });
    expect(v1).toMatchObject({ legalName: "RELIANCE", status: "Active", registrationDate: "2017-07-01", stateName: "Maharashtra" });
  });

  it("names each report section's source (FR-RP-04)", () => {
    expect(sourceLine("apisetu", "20 Oct 2026, 14:36 IST")).toEqual({ key: "live", values: { provider: "API Setu", time: "20 Oct 2026, 14:36 IST" } });
    expect(sourceLine("mca", "t", { datasetDate: "2026-10-13" })).toEqual({ key: "mca", values: { date: "2026-10-13" } });
    expect(sourceLine("mock_checks", "t").key).toBe("sample");
  });
});
