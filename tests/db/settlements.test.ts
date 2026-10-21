import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 9b database rules: settlements are visible to the organisation only, the link token never reaches the browser,
// one live settlement per agreement, never more than what is owed, outside debts need their bill, the log is append-only.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("E-Settlement (Part 9b)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let cpId: string;
  let txId: string;
  let stId: string;

  const insertSettlement = async (over: Record<string, unknown> = {}) => {
    const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-ST') as reference`;
    const row = {
      org_id: org, counterparty_id: cpId, transaction_id: txId, reference, owed_paise: 100000, owed_on: new Date().toISOString().slice(0, 10),
      settlement_paise: 90000, interest_agreed_paise: 0, waived_paise: 10000, mode: "full", link_token_hash: `st-${reference}`, ...over,
    };
    const [st] = await db<{ id: string }[]>`insert into public.settlements ${db(row)} returning id`;
    return st.id;
  };

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "st-owner", tag), makeUser(db, "st-out", tag)]);
    org = await makeOrg(db, `ZZ TEST Settle A ${tag}`, owner.id, "owner");
    await makeOrg(db, `ZZ TEST Settle B ${tag}`, outsider.id, "owner");
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address)
      values (${org}, 'business_pan', 'ZZ TEST Debtor', ${`pan-${tag}`}, 'Contact Person', ${`mob-${tag}`}, 'v1.x', '98••••3213', '{}') returning id`;
    cpId = cp.id;
    const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-TX') as reference`;
    const [tx] = await db<{ id: string }[]>`
      insert into public.transactions (org_id, counterparty_id, reference, type, invoice_no, invoice_date, place_of_supply, total_paise,
                                       due_date, terms, status)
      values (${org}, ${cp.id}, ${reference}, 'seller', ${`INV-${tag}`}, current_date - 60, '29', 100000, current_date - 30, '', 'overdue')
      returning id`;
    txId = tx.id;
    stId = await insertSettlement();
    await db`insert into public.settlement_instalments (settlement_id, org_id, seq, due_date, amount_paise) values (${stId}, ${org}, 1, current_date + 7, 90000)`;
    await db`insert into public.settlement_events (settlement_id, org_id, actor_type, event) values (${stId}, ${org}, 'system', 'created')`;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Settle % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("numbers references CHB-ST-000001 upwards", async () => {
    const [a] = await db<{ r: string }[]>`select app_private.next_reference('CHB-ST') as r`;
    expect(a.r).toMatch(/^CHB-ST-\d{6}$/);
  });

  it("shows the settlement and its schedule to the organisation only, without the link token", async () => {
    const mine = await owner.client.from("settlements").select("id, status, mode").eq("id", stId);
    expect(mine.data).toEqual([{ id: stId, status: "draft", mode: "full" }]);
    const rows = await owner.client.from("settlement_instalments").select("seq, amount_paise").eq("settlement_id", stId);
    expect(rows.data).toEqual([{ seq: 1, amount_paise: 90000 }]);
    const token = await owner.client.from("settlements").select("link_token_hash").eq("id", stId);
    expect(token.error).not.toBeNull();
    const theirs = await outsider.client.from("settlements").select("id").eq("id", stId);
    expect(theirs.data).toEqual([]);
  });

  it("refuses direct changes and keeps the activity log append-only", async () => {
    const upd = await owner.client.from("settlements").update({ status: "completed" }).eq("id", stId).select("id");
    expect(upd.data ?? []).toEqual([]);
    await expect(db`update public.settlement_events set event = 'x' where settlement_id = ${stId}`).rejects.toThrow(/append-only/);
  });

  it("allows one live settlement per agreement, and a new one after it is rejected", async () => {
    await expect(insertSettlement()).rejects.toThrow(/settlements_one_open/);
    await db`update public.settlements set status = 'rejected' where id = ${stId}`;
    const again = await insertSettlement();
    expect(again).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("never settles for more than is owed, and needs the bill for an outside debt", async () => {
    await expect(insertSettlement({ transaction_id: null, settlement_paise: 200000 })).rejects.toThrow(/check/);
    await expect(insertSettlement({ transaction_id: null })).rejects.toThrow(/check/);
    const outside = await insertSettlement({ transaction_id: null, outside_bill_no: "GST/1", outside_bill_date: "2026-09-01" });
    expect(outside).toMatch(/^[0-9a-f-]{36}$/);
  });
});
