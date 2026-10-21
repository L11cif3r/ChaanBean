import fs from "node:fs";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  addMonths, counterProblems, counterSchema, rowsOf, scheduleState, settlementClauses, settlementProblems, settlementSchema, splitEqually, waivedPaise,
} from "@/lib/settlements";
import { settlementPdf } from "@/server/pdf/settlement";
import { zip } from "@/server/zip";

// Part 9b E-Settlement rules (PRD v3.0 8.7; v1.0 S17 fields and validation, FR-ES-01–05).
const TODAY = "2026-10-19";

describe("terms (v3 8.7)", () => {
  it("works out the amount waived: owed - settlement - interest agreed", () => {
    expect(waivedPaise(1_00_000_00, 80_000_00, 2_000_00)).toBe(18_000_00);
    expect(waivedPaise(1_00_000_00, 1_00_000_00, 5_000_00)).toBe(-5_000_00);
  });

  it("splits equally with the leftover paise on the last row, monthly on the same day", () => {
    const rows = splitEqually(1_000_01, 3, "2026-11-30");
    expect(rows.map((r) => r.amountPaise)).toEqual([33_333, 33_333, 33_335]);
    expect(rows.map((r) => r.dueDate)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(splitEqually(900_00, 3, "2026-11-01", 15).map((r) => r.dueDate)).toEqual(["2026-11-01", "2026-11-16", "2026-12-01"]);
  });

  it("checks the S17 rules: within what is owed, 2 to 24 rows, increasing dates, total matches", () => {
    const base = { counterpartyId: crypto.randomUUID(), transactionId: crypto.randomUUID(), settlementPaise: 90_000_00, interestAgreedPaise: 0 };
    const tooMuch = settlementSchema.parse({ ...base, settlementPaise: 1_10_000_00, mode: "full", fullDate: "2026-10-25" });
    expect(Object.keys(settlementProblems(tooMuch, 1_00_000_00, TODAY))).toEqual(["settlementPaise"]);

    const one = settlementSchema.parse({ ...base, mode: "instalments", instalments: [{ dueDate: "2026-11-01", amountPaise: 90_000_00 }] });
    expect(settlementProblems(one, 1_00_000_00, TODAY)).toEqual({ instalments: "Add 2 to 24 instalments." });

    const bad = settlementSchema.parse({
      ...base, mode: "instalments",
      instalments: [{ dueDate: "2026-12-01", amountPaise: 40_000_00 }, { dueDate: "2026-11-01", amountPaise: 40_000_00 }],
    });
    const f = settlementProblems(bad, 1_00_000_00, TODAY);
    expect(f["instalments.1.dueDate"]).toBe("Each date must be after the one before.");
    expect(f.instalments).toBe("Instalments must add up to ₹90,000.");

    const ok = settlementSchema.parse({ ...base, interestAgreedPaise: 3_000_00, mode: "instalments", instalments: splitEqually(93_000_00, 3, "2026-11-01") });
    expect(settlementProblems(ok, 1_00_000_00, TODAY)).toEqual({});
    expect(rowsOf(settlementSchema.parse({ ...base, mode: "full", fullDate: "2026-10-30" }))).toEqual([{ dueDate: "2026-10-30", amountPaise: 90_000_00 }]);
  });

  it("needs the bill, date and amount for an outside debt", () => {
    const s = settlementSchema.parse({ counterpartyId: crypto.randomUUID(), settlementPaise: 10_000_00, mode: "full", fullDate: "2026-10-30" });
    expect(Object.keys(settlementProblems(s, 0, TODAY)).sort()).toEqual(["outsideBillDate", "outsideBillNo", "outsideOwedPaise"]);
  });

  it("checks a counter-proposal the same way, against what is owed", () => {
    const c = counterSchema.parse({ amountPaise: 1_20_000_00, mode: "full", fullDate: "2026-10-01" });
    expect(Object.keys(counterProblems(c, 1_00_000_00, TODAY)).sort()).toEqual(["amountPaise", "fullDate"]);
  });

  it("puts the default clause with the grace days in the terms", () => {
    const c = settlementClauses({ graceDays: 10, originalReference: "CHB-TX-000042", outsideBillNo: null, jurisdiction: "Bengaluru" });
    expect(c.some((x) => x.includes("within 10 days") && x.includes("CHB-TX-000042"))).toBe(true);
  });
});

describe("instalments as they run (FR-ES-05)", () => {
  const rows = [
    { dueDate: "2026-11-01", amountPaise: 30_000_00 },
    { dueDate: "2026-12-01", amountPaise: 30_000_00 },
    { dueDate: "2027-01-01", amountPaise: 30_000_00 },
  ];

  it("fills instalments in date order and shows the next one", () => {
    const s = scheduleState(rows, [{ paidOn: "2026-10-30", amountPaise: 45_000_00 }], "2026-11-15", 7);
    expect(s.instalments.map((i) => [i.status, i.paidPaise])).toEqual([["paid", 30_000_00], ["due", 15_000_00], ["due", 0]]);
    expect(s.instalments[0].paidOn).toBe("2026-10-30");
    expect(s.next?.seq).toBe(2);
    expect(s.remainingPaise).toBe(45_000_00);
    expect(s.outcome).toBe("running");
  });

  it("marks an instalment missed only after the grace days, and the settlement defaults", () => {
    expect(scheduleState(rows, [], "2026-11-08", 7).instalments[0].status).toBe("due");
    const late = scheduleState(rows, [], "2026-11-09", 7);
    expect(late.instalments[0].status).toBe("missed");
    expect(late.outcome).toBe("defaulted");
    // Paying after the grace days does not undo the default.
    expect(scheduleState(rows, [{ paidOn: "2026-11-10", amountPaise: 30_000_00 }], "2026-11-12", 7).outcome).toBe("defaulted");
  });

  it("completes when every instalment is paid on time", () => {
    const pays = [{ paidOn: "2026-11-05", amountPaise: 30_000_00 }, { paidOn: "2026-12-01", amountPaise: 30_000_00 }, { paidOn: "2027-01-03", amountPaise: 30_000_00 }];
    const s = scheduleState(rows, pays, "2027-01-03", 7);
    expect(s.outcome).toBe("completed");
    expect(s.remainingPaise).toBe(0);
  });
});

describe("settlement PDF and the evidence ZIP", () => {
  it("draws a preview and a sealed settlement", async () => {
    const doc = {
      reference: "CHB-ST-000007", version: 2,
      creditor: { name: "Sharma Steel Traders", gstin: "29ABCDE1234F1Z5", address: "Peenya, Bengaluru" },
      debtor: { name: "Om Builders Private Limited", gstin: null, address: null },
      original: { reference: "CHB-TX-000042", billNo: null, billDate: null },
      owedPaise: 15_42_000_00, owedOn: "2026-12-20", settlementPaise: 14_00_000_00, interestAgreedPaise: 20_000_00, waivedPaise: 1_22_000_00,
      mode: "instalments" as const, rows: splitEqually(14_20_000_00, 3, "2027-01-05"), graceDays: 7, terms: "", jurisdiction: "Bengaluru",
      verifyUrl: "http://localhost:3400/v/CHB-ST-000007", generatedAt: new Date("2026-12-20T10:00:00Z"),
    };
    const preview = await settlementPdf(doc);
    expect(Buffer.from(preview.slice(0, 5)).toString()).toBe("%PDF-");
    const sealed = await settlementPdf({ ...doc, acceptance: { name: "Suresh Nair", mobileMasked: "98••••4410", otpRef: "otp-1", at: new Date("2026-12-21T05:00:00Z"), ip: null, device: "Android Chrome" } });
    expect(sealed.length).toBeGreaterThan(5_000);
    if (process.env.WRITE_PDF) fs.writeFileSync(process.env.WRITE_PDF, sealed);
  });

  it("writes a ZIP whose entries read back byte for byte", () => {
    const a = new TextEncoder().encode("hello ".repeat(200));
    const b = new Uint8Array([1, 2, 3]);
    const bytes = Buffer.from(zip([{ name: "a.txt", bytes: a }, { name: "dir/b.bin", bytes: b }]));
    // Walk the local headers.
    const read: Record<string, Buffer> = {};
    let o = 0;
    while (bytes.readUInt32LE(o) === 0x04034b50) {
      const method = bytes.readUInt16LE(o + 8);
      const size = bytes.readUInt32LE(o + 18);
      const nameLen = bytes.readUInt16LE(o + 26);
      const name = bytes.subarray(o + 30, o + 30 + nameLen).toString();
      const data = bytes.subarray(o + 30 + nameLen, o + 30 + nameLen + size);
      read[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
      expect(zlib.crc32(read[name]) >>> 0).toBe(bytes.readUInt32LE(o + 14));
      o += 30 + nameLen + size;
    }
    expect(read["a.txt"].equals(Buffer.from(a))).toBe(true);
    expect(read["dir/b.bin"].equals(Buffer.from(b))).toBe(true);
    expect(bytes.readUInt32LE(bytes.length - 22)).toBe(0x06054b50);
  });
});
