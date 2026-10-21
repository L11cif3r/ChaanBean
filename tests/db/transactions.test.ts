import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 9 database rules: agreements are visible to the organisation only, the link token never reaches the browser,
// nothing is changed directly by signed-in users, the activity log is append-only, references count up.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("Business Security (Part 9)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let txId: string;

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "bs-owner", tag), makeUser(db, "bs-out", tag)]);
    org = await makeOrg(db, `ZZ TEST Deals A ${tag}`, owner.id, "owner");
    await makeOrg(db, `ZZ TEST Deals B ${tag}`, outsider.id, "owner");
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address)
      values (${org}, 'business_pan', 'ZZ TEST Buyer', ${`pan-${tag}`}, 'Contact Person', ${`mob-${tag}`}, 'v1.x', '98••••3213', '{}') returning id`;
    const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-TX') as reference`;
    const [tx] = await db<{ id: string }[]>`
      insert into public.transactions (org_id, counterparty_id, reference, type, invoice_no, invoice_date, place_of_supply, total_paise,
                                       due_date, terms, link_token_hash)
      values (${org}, ${cp.id}, ${reference}, 'seller', ${`INV-${tag}`}, current_date, '29', 100000, current_date + 30, '', ${`tok-${tag}`})
      returning id`;
    txId = tx.id;
    await db`insert into public.transaction_events (transaction_id, org_id, actor_type, event) values (${tx.id}, ${org}, 'system', 'created')`;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Deals % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("numbers references CHB-TX-000001 upwards", async () => {
    const [a] = await db<{ r: string }[]>`select app_private.next_reference('CHB-TX') as r`;
    const [b] = await db<{ r: string }[]>`select app_private.next_reference('CHB-TX') as r`;
    expect(a.r).toMatch(/^CHB-TX-\d{6}$/);
    expect(Number(b.r.slice(-6))).toBe(Number(a.r.slice(-6)) + 1);
  });

  it("shows the agreement to the organisation only, without the link token", async () => {
    const mine = await owner.client.from("transactions").select("id, status").eq("id", txId);
    expect(mine.data).toEqual([{ id: txId, status: "draft" }]);
    const token = await owner.client.from("transactions").select("link_token_hash").eq("id", txId);
    expect(token.error).not.toBeNull();
    const theirs = await outsider.client.from("transactions").select("id").eq("id", txId);
    expect(theirs.data).toEqual([]);
  });

  it("refuses direct changes and keeps the activity log append-only", async () => {
    const upd = await owner.client.from("transactions").update({ status: "paid" }).eq("id", txId).select("id");
    expect(upd.data ?? []).toEqual([]);
    await expect(db`update public.transaction_events set event = 'x' where transaction_id = ${txId}`).rejects.toThrow(/append-only/);
  });

  it("allows an invoice number once per counterparty", async () => {
    const [{ reference }] = await db<{ reference: string }[]>`select app_private.next_reference('CHB-TX') as reference`;
    await expect(db`
      insert into public.transactions (org_id, counterparty_id, reference, type, invoice_no, invoice_date, total_paise, due_date, terms)
      select org_id, counterparty_id, ${reference}, 'seller', upper(invoice_no), current_date, 100, current_date + 1, ''
        from public.transactions where id = ${txId}`).rejects.toThrow(/transactions_invoice_unique/);
  });
});
