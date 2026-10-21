import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBulkFile, rowKey } from "@/server/bulk/rows";

// The example list offered on the multiple search page (public/samples) must always upload cleanly.
describe("multiple search example file", () => {
  it("reads every row of the Companies sheet with the expected kind of match", () => {
    const bytes = new Uint8Array(fs.readFileSync("public/samples/chaanbean-multiple-search-example.xlsx"));
    const rows = parseBulkFile(bytes, "chaanbean-multiple-search-example.xlsx");
    expect(rows).toHaveLength(11);
    expect(rows.map((r) => rowKey(r).kind)).toEqual(["gstin", "gstin", "cin", "cin", "cin", "name", "name", "name", "name", "cin", "invalid"]);
    expect(rows[4]).toMatchObject({ contactName: "Test Contact One", contactMobile: "9000000002", contactEmail: "buyer1@example.com" });
  });
});
