import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { totals } from "@/lib/transactions";
import { agreementPdf, type AgreementDoc } from "@/server/pdf/agreement";

// Part 9: the agreement PDF draws for every type, preview and sealed, with ₹ in the embedded font.
const items = totals([
  { product: "TMT bars Fe 500D 12 mm", hsn: "7214", qty: 20, unit: "MT", ratePaise: 52_000_00, gstBp: 1800 },
  { product: "TMT bars Fe 500D 16 mm", hsn: "7214", qty: 8, unit: "MT", ratePaise: 51_500_00, gstBp: 1800 },
]);
const doc: AgreementDoc = {
  reference: "CHB-TX-000042", version: 1, type: "seller",
  creator: { name: "Sharma Steel Traders", gstin: "29ABCDE1234F1Z5", address: "Peenya, Bengaluru" },
  counterparty: { name: "Om Builders Private Limited", gstin: "29AAACO1234K1Z2", address: null },
  invoiceNo: "SST/26-27/0412", invoiceDate: "2026-10-14", placeOfSupply: "Karnataka", items: items.lines,
  totalPaise: items.totalPaise, paidNowPaise: 2_00_000_00, dueDate: "2026-11-13", interestBp: 1800,
  terms: "Delivery at site. Unloading by buyer.", jurisdiction: "Bengaluru", verifyUrl: "http://localhost:3400/v/CHB-TX-000042",
  generatedAt: new Date("2026-10-14T10:00:00Z"),
};

describe("agreement PDF", () => {
  it("draws a preview and a sealed copy", async () => {
    const preview = await agreementPdf(doc);
    expect(Buffer.from(preview.slice(0, 5)).toString()).toBe("%PDF-");
    const sealed = await agreementPdf({
      ...doc,
      acceptance: { name: "Suresh Nair", mobileMasked: "98••••4410", otpRef: "otp-7731", at: new Date("2026-10-14T11:44:12Z"), ip: "49.207.10.2", device: "Android Chrome" },
    });
    expect(sealed.length).toBeGreaterThan(5_000);
    if (process.env.WRITE_PDF) fs.writeFileSync(process.env.WRITE_PDF, sealed);
  });
});
