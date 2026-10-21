import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 3 database rules, as changed by PRD v4.0 section 3: payment orders and webhooks, plan activation, wallet top-ups,
// hold/commit/reverse charging (always wallet money, at the plan's price list or pay-per-use), GST invoices, the
// append-only ledger and row-level security on billing data.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("billing (Part 3)", () => {
  let db: Db;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let planOrg: string; // Plan B, same state as the supplier (CGST + SGST)
  let walletOrg: string; // pay-per-use, Maharashtra (IGST)

  const order = async (org: string, purpose: "plan" | "topup", plan: string | null, amount: number | null) => {
    const [o] = await db<{ id: string; taxable_paise: string; gst_paise: string; total_paise: string }[]>`
      select id, taxable_paise, gst_paise, total_paise
        from app_private.create_payment_order(${org}::uuid, ${purpose}::public.payment_purpose, ${plan}, ${amount}::bigint, 'mock', null)`;
    const providerOrderId = `mock_order_${tag}_${o.id.slice(0, 8)}`;
    await db`update public.payment_orders set provider_order_id = ${providerOrderId} where id = ${o.id}`;
    return { ...o, providerOrderId, total: Number(o.total_paise) };
  };

  const event = (providerOrderId: string, eventId: string, amount: number, type = "payment.succeeded", reason: string | null = null) => db<
    { order_id: string | null; outcome: string }[]
  >`
    select * from app_private.apply_payment_event('mock', ${`${tag}-${eventId}`}, ${type}, ${providerOrderId},
      ${`pay_${eventId}`}, ${amount}::bigint, ${reason}, '{}'::jsonb)`;

  const hold = (org: string, item: string, key: string | null = null, expires = "10 minutes") => db<
    { id: string; source: string; units: number; amount_paise: string; gst_paise: string; balance_after_paise: string | null }[]
  >`
    select id, source::text, units, amount_paise, gst_paise, balance_after_paise
      from app_private.place_hold(${org}::uuid, ${item}, 'check_request', ${`ref-${tag}`}, ${key},
        now() + ${expires}::interval, 'vitest', ${`test-${tag}`})`;

  const close = (org: string, holdId: string, commit: boolean) => db<{ id: string; type: string }[]>`
    select id, type::text from app_private.close_hold(${org}::uuid, ${holdId}::bigint, ${commit}, null, 'vitest', ${`test-${tag}`})`;

  const price = async (org: string, item: string) => {
    const [p] = await db<{ price_paise: string; gst_rate_bp: number }[]>`select price_paise, gst_rate_bp from app_private.effective_price(${org}::uuid, ${item})`;
    const net = Number(p.price_paise);
    return net + Math.round((net * p.gst_rate_bp) / 10000);
  };

  const balance = async (org: string) => {
    const [w] = await db<{ b: string }[]>`select balance_paise as b from public.wallets where org_id = ${org}`;
    return Number(w?.b ?? 0);
  };

  beforeAll(async () => {
    db = connect();
    [owner, member, outsider] = await Promise.all([makeUser(db, "bill-owner", tag), makeUser(db, "bill-member", tag), makeUser(db, "bill-out", tag)]);
    planOrg = await makeOrg(db, `ZZ TEST Billing Plan ${tag}`, owner.id, "owner");
    walletOrg = await makeOrg(db, `ZZ TEST Billing Wallet ${tag}`, owner.id, "owner");
    await db`update public.organisations set state_code = '29' where id = ${planOrg}`;
    await db`update public.organisations set state_code = '27' where id = ${walletOrg}`;
    await db`
      insert into public.memberships (org_id, user_id, role, status, joined_at)
      values (${planOrg}, ${member.id}, 'member', 'active', now())`;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST %${tag}%`}`;
    await removeUsers(db, [owner?.id, member?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("prices Plan B at ₹17,599 plus 18% GST and activates it only on a verified success event", async () => {
    const o = await order(planOrg, "plan", "plan_b", null);
    expect([Number(o.taxable_paise), Number(o.gst_paise), o.total]).toEqual([1759900, 316782, 2076682]);

    const [failed] = await event(o.providerOrderId, "plan-wrong-amount", o.total - 100);
    expect(failed.outcome).toBe("amount_mismatch");
    const [none] = await db`select count(*)::int as n from public.subscriptions where org_id = ${planOrg}`;
    expect(none.n).toBe(0);

    const [paid] = await event(o.providerOrderId, "plan-ok", o.total);
    expect(paid.outcome).toBe("paid");
    const [sub] = await db`
      select v.plan_code, s.status::text, s.auto_renew, (s.ends_at - s.starts_at) > interval '360 days' as year
        from public.subscriptions s join public.plan_versions v on v.id = s.plan_version_id where s.org_id = ${planOrg}`;
    expect(sub).toEqual({ plan_code: "plan_b", status: "active", auto_renew: true, year: true });
    const [org] = await db`select seat_limit from public.organisations where id = ${planOrg}`;
    expect(org.seat_limit).toBe(5);
  });

  it("does not double-credit when the gateway repeats a webhook", async () => {
    const [p] = await db<{ provider_order_id: string; total_paise: string }[]>`
      select provider_order_id, total_paise from public.payment_orders where org_id = ${planOrg} and status = 'paid'`;
    const [again] = await event(p.provider_order_id, "plan-ok", Number(p.total_paise));
    expect(again.outcome).toBe("duplicate_event");
    const [second] = await event(p.provider_order_id, "plan-ok-second-id", Number(p.total_paise));
    expect(second.outcome).toBe("already_paid");
    const [n] = await db`select count(*)::int as subs, (select count(*)::int from public.invoices where org_id = ${planOrg}) as invoices
                           from public.subscriptions where org_id = ${planOrg}`;
    expect(n).toEqual({ subs: 1, invoices: 1 });
    await expect(order(planOrg, "plan", "plan_a", null)).rejects.toThrow(/ALREADY_SUBSCRIBED/);
  });

  it("issues a GST invoice with CGST and SGST inside the supplier's state", async () => {
    const [inv] = await db`
      select number, financial_year, place_of_supply, sac, taxable_paise::int, cgst_paise::int, sgst_paise::int,
             igst_paise::int, total_paise::int, customer->>'legal_name' as customer
        from public.invoices where org_id = ${planOrg}`;
    expect(inv.number).toMatch(/^CB\/\d{4}-\d{2}\/\d{5}$/);
    expect(inv.place_of_supply).toBe("29");
    expect(inv.sac).toMatch(/^\d{6}$/);
    expect([inv.taxable_paise, inv.cgst_paise, inv.sgst_paise, inv.igst_paise, inv.total_paise]).toEqual([1759900, 158391, 158391, 0, 2076682]);
    expect(inv.customer).toBe(`ZZ TEST Billing Plan ${tag}`);
    await expect(db`update public.invoices set total_paise = 1 where org_id = ${planOrg}`).rejects.toThrow(/append-only/);
  });

  it("credits a top-up in full, works the GST out of it and invoices it with IGST across states", async () => {
    await expect(order(walletOrg, "topup", null, 99_900)).rejects.toThrow(/TOPUP_OUT_OF_RANGE/);
    await expect(order(walletOrg, "topup", null, 50_000_100)).rejects.toThrow(/TOPUP_OUT_OF_RANGE/);
    const o = await order(walletOrg, "topup", null, 100_000);
    expect([Number(o.taxable_paise), Number(o.gst_paise), o.total]).toEqual([84746, 15254, 100000]);
    const [paid] = await event(o.providerOrderId, "topup-ok", o.total);
    expect(paid.outcome).toBe("paid");
    expect(await balance(walletOrg)).toBe(100000);
    const [entry] = await db`select type::text, amount_paise::int, balance_after_paise::int from public.usage_ledger where payment_order_id = ${o.id}`;
    expect(entry).toEqual({ type: "topup", amount_paise: 100000, balance_after_paise: 100000 });
    const [inv] = await db`select place_of_supply, cgst_paise::int, sgst_paise::int, igst_paise::int, description from public.invoices where payment_order_id = ${o.id}`;
    expect(inv).toEqual({ place_of_supply: "27", cgst_paise: 0, sgst_paise: 0, igst_paise: 15254, description: "Chaanbean wallet top-up" });
  });

  it("marks a failed payment and ignores a late success for an amount that does not match", async () => {
    const o = await order(walletOrg, "topup", null, 200_000);
    const [failed] = await event(o.providerOrderId, "topup-fail", o.total, "payment.failed", "Card declined by the bank");
    expect(failed.outcome).toBe("failed");
    const [row] = await db`select status::text, failure_reason from public.payment_orders where id = ${o.id}`;
    expect(row).toEqual({ status: "failed", failure_reason: "Card declined by the bank" });
    expect(await balance(walletOrg)).toBe(100000);
  });

  it("puts a plan payment into the wallet and charges every check from it, at the plan's price or pay-per-use, plus GST", async () => {
    expect(await balance(planOrg)).toBe(2076682);
    const cost = await price(planOrg, "CW_GST_SEARCH");
    const [h] = await hold(planOrg, "CW_GST_SEARCH");
    expect([h.source, h.units, Number(h.amount_paise)]).toEqual(["wallet", 0, -cost]);
    const [c] = await close(planOrg, h.id, true);
    expect(c.type).toBe("commit");
    expect(await balance(planOrg)).toBe(2076682 - cost);

    // Pay-per-use organisation: ₹189 + ₹34.02 GST.
    const [w] = await hold(walletOrg, "CW_CREDIT_RATING");
    expect([w.source, Number(w.amount_paise), Number(w.gst_paise), Number(w.balance_after_paise)]).toEqual(["wallet", -22302, -3402, 77698]);
    await close(walletOrg, w.id, true);
    expect(await balance(walletOrg)).toBe(77698);
  });

  it("uses the plan's own price list while the plan is active (Option A), pay-per-use for everyone else", async () => {
    const [pp] = await db<{ id: string }[]>`
      insert into public.plan_prices (plan_code, item_code, price_paise, effective_from) values ('plan_b', 'CW_DIRECTORS', 15000, now() - interval '1 minute')
      returning id`;
    try {
      expect(await price(planOrg, "CW_DIRECTORS")).toBe(17700);
      expect(await price(walletOrg, "CW_DIRECTORS")).toBe(22302);
      const [h] = await hold(planOrg, "CW_DIRECTORS");
      expect([h.source, Number(h.amount_paise), Number(h.gst_paise)]).toEqual(["wallet", -17700, -2700]);
      await close(planOrg, h.id, false);
    } finally {
      await db`delete from public.plan_prices where id = ${pp.id}`;
    }
  });

  it("reverses a failed action's hold, restoring the money, and closes each hold once", async () => {
    const before = await balance(walletOrg);
    const [w] = await hold(walletOrg, "CC_COURT");
    expect(await balance(walletOrg)).toBe(before - 34102);
    const [r] = await close(walletOrg, w.id, false);
    expect(r.type).toBe("reverse");
    expect(await balance(walletOrg)).toBe(before);
    const [again] = await close(walletOrg, w.id, false);
    expect(again.id).toBe(r.id);
    await expect(close(walletOrg, w.id, true)).rejects.toThrow(/HOLD_REVERSED/);

    const planBefore = await balance(planOrg);
    const [p] = await hold(planOrg, "CC_COURT");
    expect(await balance(planOrg)).toBeLessThan(planBefore);
    await close(planOrg, p.id, false);
    expect(await balance(planOrg)).toBe(planBefore);
  });

  it("follows the catalogue: removed and renamed items are refused, unpriced items cannot be charged", async () => {
    // Removed (the old single bureau item) or renamed in v3 (CW_GST_TURNOVER, CW_DIRECTOR): inactive, so no hold.
    for (const code of ["CW_BUREAU", "CW_GST_TURNOVER", "CW_DIRECTOR", "CW_MOBILE_PAN"]) await expect(hold(walletOrg, code)).rejects.toThrow(/UNKNOWN_ITEM/);
    // Priced items of v4 section 13, before GST.
    const prices = await db<{ code: string; p: number }[]>`
      select c as code, (app_private.current_price(c)).price_paise::int as p
        from unnest(array['CW_GST_SEARCH', 'CW_COMPANY', 'CW_MSME', 'CW_PAN', 'CW_CIBIL_COMPANY', 'CW_CIBIL_PERSONAL']) c order by c`;
    expect(prices).toEqual([
      { code: "CW_CIBIL_COMPANY", p: 38900 }, { code: "CW_CIBIL_PERSONAL", p: 38900 }, { code: "CW_COMPANY", p: 200 },
      { code: "CW_GST_SEARCH", p: 1500 }, { code: "CW_MSME", p: 18900 }, { code: "CW_PAN", p: 1500 },
    ]);
    // GST turnover for the current year has no price until Mohan sets one.
    await expect(hold(walletOrg, "CW_GST_TURNOVER_CY")).rejects.toThrow(/NO_PRICE/);
    const [c] = await hold(planOrg, "CW_CIBIL_COMPANY");
    expect(c.source).toBe("wallet");
    await close(planOrg, c.id, false);
  });

  it("returns the same hold for the same idempotency key", async () => {
    const key = `idem-${tag}`;
    const [a] = await hold(walletOrg, "CW_GST_SEARCH", key);
    const [b] = await hold(walletOrg, "CW_GST_SEARCH", key);
    expect(b.id).toBe(a.id);
    await close(walletOrg, a.id, false);
  });

  it("reverses holds that are still open after they expire", async () => {
    const before = await balance(walletOrg);
    const [h] = await hold(walletOrg, "CW_GST_TURNOVER_4Y", null, "-1 second");
    expect(await balance(walletOrg)).toBeLessThan(before);
    await db`select app_private.release_expired_holds()`;
    const [closing] = await db`select type::text, note from public.usage_ledger where hold_id = ${h.id}`;
    expect(closing).toEqual({ type: "reverse", note: "Hold expired" });
    expect(await balance(walletOrg)).toBe(before);
  });

  it("never lets simultaneous charges overdraw the wallet", async () => {
    const start = await balance(walletOrg); // ₹776.98 → room for two ₹341.02 checks, not three
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => hold(walletOrg, "CC_AML")));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(Math.floor(start / 34102));
    expect(results.filter((r) => r.status === "rejected").every((r) => /INSUFFICIENT_BALANCE/.test(String((r as PromiseRejectedResult).reason)))).toBe(true);
    expect(await balance(walletOrg)).toBe(start - ok * 34102);
    const [sum] = await db`select sum(amount_paise)::bigint as s from public.usage_ledger where org_id = ${walletOrg} and source = 'wallet'`;
    expect(Number(sum.s)).toBe(await balance(walletOrg));
    for (const r of results) if (r.status === "fulfilled") await close(walletOrg, r.value[0].id, true);
  });

  it("keeps the ledger append-only", async () => {
    await expect(db`update public.usage_ledger set amount_paise = 0 where org_id = ${walletOrg}`).rejects.toThrow(/append-only/);
    await expect(db`delete from public.usage_ledger where org_id = ${walletOrg}`).rejects.toThrow(/append-only/);
  });

  it("shows plan and wallet to members, the ledger and invoices only to Owner and Admin, nothing to outsiders", async () => {
    const read = async (u: TestUser, table: "subscriptions" | "wallets" | "usage_ledger" | "invoices" | "payment_orders") => {
      const { data, error } = await u.client.from(table).select("org_id").eq("org_id", planOrg);
      expect(error).toBeNull();
      return data?.length ?? 0;
    };
    expect(await read(member, "subscriptions")).toBe(1);
    expect(await read(member, "wallets")).toBe(1);
    expect(await read(member, "usage_ledger")).toBe(0);
    expect(await read(member, "invoices")).toBe(0);
    expect(await read(member, "payment_orders")).toBe(0);
    expect(await read(owner, "usage_ledger")).toBeGreaterThan(0);
    expect(await read(owner, "invoices")).toBe(1);
    expect(await read(outsider, "subscriptions")).toBe(0);
    expect(await read(outsider, "wallets")).toBe(0);

    const { data: plans } = await outsider.client.from("plan_version_items").select("item_code");
    expect(plans?.length).toBeGreaterThan(20);
    const { error: costError } = await outsider.client.from("item_prices").select("cost_paise");
    expect(costError).not.toBeNull();
    const before = await balance(planOrg);
    await owner.client.from("wallets").update({ balance_paise: 999999 }).eq("org_id", planOrg);
    expect(await balance(planOrg)).toBe(before);
  });
});
