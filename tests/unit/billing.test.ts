import { describe, expect, it } from "vitest";
import { HEADLINE_ITEMS, isTopupInRange, topupSplit, withGst } from "@/lib/billing";
import { ledgerCsv, type LedgerRow } from "@/server/billing/service";

// The browser previews must show the same figures the database functions charge (tests/db/billing.test.ts).
describe("billing figures", () => {
  it("adds 18% GST to plan prices like app_private.gst_on", () => {
    expect(withGst(1_759_900n)).toEqual({ taxable: 1_759_900n, gst: 316_782n, total: 2_076_682n });
    expect(withGst(1_159_900n)).toEqual({ taxable: 1_159_900n, gst: 208_782n, total: 1_368_682n });
  });

  it("works the GST out of a top-up like app_private.create_payment_order", () => {
    expect(topupSplit(100_000n)).toEqual({ taxable: 84_746n, gst: 15_254n, total: 100_000n });
    expect(topupSplit(200_000n)).toEqual({ taxable: 169_492n, gst: 30_508n, total: 200_000n });
  });

  it("accepts top-ups from ₹1,000 to ₹5,00,000", () => {
    expect([99_999n, 100_000n, 50_000_000n, 50_000_001n].map(isTopupInRange)).toEqual([false, true, true, false]);
  });

  it("shows six headline items on each plan card", () => {
    expect(HEADLINE_ITEMS).toHaveLength(6);
  });

  it("writes the ledger statement as CSV with debits, credits and the running balance", () => {
    const row = (r: Partial<LedgerRow>): LedgerRow => ({
      id: "1", at: new Date("2026-10-15T10:00:00Z"), type: "topup", source: "wallet", itemCode: null, itemName: null, units: 0,
      amountPaise: 0n, gstPaise: 0n, balanceAfterPaise: null, refType: null, refId: null, note: null, ...r,
    });
    const csv = ledgerCsv([
      row({ type: "hold", itemCode: "CC_COURT", itemName: "Court Case History", amountPaise: -34_102n, gstPaise: -5_202n, balanceAfterPaise: 65_898n, refType: "check_request", refId: "abc" }),
      row({ amountPaise: 100_000n, gstPaise: 15_254n, balanceAfterPaise: 100_000n, note: 'Note with "quotes", comma' }),
    ]).split("\r\n");
    expect(csv[1]).toBe('"15 Oct 2026, 15:30 IST",hold,wallet,Court Case History,0,341.02,,52.02,658.98,check_request:abc,');
    expect(csv[2]).toBe('"15 Oct 2026, 15:30 IST",topup,wallet,,0,,1000.00,152.54,1000.00,,"Note with ""quotes"", comma"');
  });
});
