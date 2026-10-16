import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 5 database rules: report numbers in sequence, reports readable by the organisation only, no direct writes.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("checks and reports (Part 5)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let other: string;
  let requestId: string;

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "ck-owner", tag), makeUser(db, "ck-out", tag)]);
    org = await makeOrg(db, `ZZ TEST Checks A ${tag}`, owner.id, "owner");
    other = await makeOrg(db, `ZZ TEST Checks B ${tag}`, outsider.id, "owner");
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address)
      values (${org}, 'business_pan', 'ZZ TEST Buyer', ${`pan-${tag}`}, 'Contact Person', ${`mob-${tag}`}, 'v1.x', '98••••3213', '{}') returning id`;
    const [{ no }] = await db<{ no: string }[]>`select app_private.next_report_no() as no`;
    const [req] = await db<{ id: string }[]>`
      insert into public.check_requests (org_id, counterparty_id, report_no, run_mode) values (${org}, ${cp.id}, ${no}, 'together') returning id`;
    requestId = req.id;
    await db`insert into public.check_items (org_id, request_id, counterparty_id, item_code, status) values (${org}, ${req.id}, ${cp.id}, 'CW_GST_SEARCH', 'queued')`;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Checks % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("numbers reports CR-<year>-000001 upwards without gaps", async () => {
    const [a] = await db<{ no: string }[]>`select app_private.next_report_no() as no`;
    const [b] = await db<{ no: string }[]>`select app_private.next_report_no() as no`;
    expect(a.no).toMatch(/^CR-\d{4}-\d{6}$/);
    expect(Number(b.no.slice(-6))).toBe(Number(a.no.slice(-6)) + 1);
  });

  it("shows a report and its checks to the organisation only", async () => {
    const mine = await owner.client.from("check_items").select("request_id").eq("request_id", requestId);
    expect(mine.data).toHaveLength(1);
    const theirs = await outsider.client.from("check_requests").select("id").eq("id", requestId);
    expect(theirs.data).toEqual([]);
    expect(other).toBeTruthy();
  });

  it("refuses direct writes from signed-in users", async () => {
    const upd = await owner.client.from("check_items").update({ status: "success" }).eq("request_id", requestId).select("id");
    expect(upd.data ?? []).toEqual([]);
    const [row] = await db`select status::text from public.check_items where request_id = ${requestId}`;
    expect(row.status).toBe("queued");
  });
});
