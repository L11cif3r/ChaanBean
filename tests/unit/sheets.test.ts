import { describe, expect, it } from "vitest";
import { readCsv, readSheet } from "@/server/sheets";
import { rowContact, rowKey, tableRows } from "@/server/bulk/rows";
import { xlsx } from "@/server/xlsx";
import { zip } from "@/server/zip";

// Multiple search upload (v4 6.1): CSV and Excel (.xlsx) lists read the same way, headings in any order.
const enc = (s: string) => new TextEncoder().encode(s);

describe("company list upload", () => {
  it("reads CSV with quotes, commas inside quotes, semicolons and a BOM", () => {
    expect(readCsv('﻿GSTIN,Company name\r\n29AAPFQ4691F2ZL,"Om Builders, Pune"\r\n')).toEqual([["GSTIN", "Company name"], ["29AAPFQ4691F2ZL", "Om Builders, Pune"]]);
    expect(readCsv("GSTIN;Mobile\n27AAA;9876543210\n")).toEqual([["GSTIN", "Mobile"], ["27AAA", "9876543210"]]);
  });

  it("reads the first sheet of an .xlsx with shared and inline strings and numbers", () => {
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Mobile</t></is></c></row>
      <row r="2"><c r="A2" t="s"><v>1</v></c><c r="C2"><v>9876543210</v></c></row>
    </sheetData></worksheet>`;
    const sst = "<sst><si><t>GSTIN</t></si><si><r><t>29AAP</t></r><r><t>FQ4691F2ZL</t></r></si></sst>";
    const wb = '<workbook><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>';
    const rels = '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>';
    const bytes = zip([
      { name: "xl/workbook.xml", bytes: enc(wb) }, { name: "xl/_rels/workbook.xml.rels", bytes: enc(rels) },
      { name: "xl/sharedStrings.xml", bytes: enc(sst) }, { name: "xl/worksheets/sheet1.xml", bytes: enc(sheet) },
    ]);
    expect(readSheet(bytes, "list.xlsx")).toEqual([["GSTIN", "", "Mobile"], ["29AAPFQ4691F2ZL", "", "9876543210"]]);
  });

  it("finds the template columns by heading in any order and refuses a file without company_name, gstin or cin", () => {
    const rows = tableRows([["Mobile No", "Company Name", "GST Number", "CIN"], ["9876543210", "Om", "29AAPFQ4691F2ZL", ""], ["", "", "", ""]]);
    expect(rows).toEqual([{ companyName: "Om", gstin: "29AAPFQ4691F2ZL", cin: "", city: "", state: "", contactName: "", contactMobile: "9876543210", contactEmail: "" }]);
    expect(() => tableRows([["Mobile"], ["98765"]])).toThrow(/company_name, gstin or cin/);
  });

  it("matches a row by GSTIN, then CIN or LLPIN, then name (FR-BK-01) and keeps only a usable contact", () => {
    const base = { companyName: "", gstin: "", cin: "", city: "", state: "", contactName: "", contactMobile: "", contactEmail: "" };
    expect(rowKey({ ...base, gstin: "29aapfq4691f2zl", cin: "U52609KA2022PTC158514" })).toEqual({ kind: "gstin", value: "29AAPFQ4691F2ZL" });
    expect(rowKey({ ...base, gstin: "29AAPFQ4691F2ZX" })).toEqual({ kind: "invalid", reason: "badGstin" });
    expect(rowKey({ ...base, cin: "aab-1234" })).toEqual({ kind: "cin", value: "AAB-1234" });
    expect(rowKey({ ...base, companyName: "Om Builders & Co." })).toEqual({ kind: "name", value: "om builders and co" });
    expect(rowKey({ ...base, companyName: "Om" })).toEqual({ kind: "invalid", reason: "shortName" });
    expect(rowContact({ ...base, contactName: "Ravi", contactMobile: "+91 98765 43210", contactEmail: "bad" })).toEqual({ name: "Ravi", mobile: "9876543210", email: null });
    expect(rowContact({ ...base, contactName: "Ravi", contactMobile: "123" })).toBeNull();
  });

  it("writes an .xlsx that reads back the same, with formula-looking text kept as text", () => {
    const bytes = xlsx("Results", [["Company", "Years"], ["=HYPERLINK(1)", 7], ["A & B <Ltd>", null]]);
    expect(readSheet(bytes, "out.xlsx")).toEqual([["Company", "Years"], ["=HYPERLINK(1)", "7"], ["A & B <Ltd>"]]);
  });

  it("asks for .xlsx or CSV instead of the old .xls format", () => {
    expect(() => readSheet(enc("not a zip"), "old.xls")).toThrow(/\.xlsx or CSV/);
  });
});
