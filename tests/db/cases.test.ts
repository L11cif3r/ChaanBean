import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 8 database rules: Case Check matches are visible to the organisation only, the search details stay on the
// server, and reviews are made through the server only.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("Case Check (Part 8)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let requestId: string;
  let matchId: string;

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "cc-owner", tag), makeUser(db, "cc-out", tag)]);
    org = await makeOrg(db, `ZZ TEST Cases A ${tag}`, owner.id, "owner");
    await makeOrg(db, `ZZ TEST Cases B ${tag}`, outsider.id, "owner");
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address)
      values (${org}, 'business_pan', 'ZZ TEST Buyer', ${`pan-${tag}`}, 'Contact Person', ${`mob-${tag}`}, 'v1.x', '98••••3213', '{}') returning id`;
    const [{ no }] = await db<{ no: string }[]>`select app_private.next_report_no() as no`;
    const [req] = await db<{ id: string }[]>`
      insert into public.check_requests (org_id, counterparty_id, report_no, run_mode, tab, inputs_ciphertext, inputs_summary)
      values (${org}, ${cp.id}, ${no}, 'together', 'case_check', 'v1.secret', ${db.json({ name: "ZZ TEST Buyer", state: "29", district: "Bengaluru" })})
      returning id`;
    requestId = req.id;
    const [item] = await db<{ id: string }[]>`
      insert into public.check_items (org_id, request_id, counterparty_id, item_code, status)
      values (${org}, ${req.id}, ${cp.id}, 'CC_COURT', 'success') returning id`;
    const [m] = await db<{ id: string }[]>`
      insert into public.case_matches (org_id, counterparty_id, request_id, check_item_id, source, source_id, court, case_type, case_status, confidence)
      values (${org}, ${cp.id}, ${req.id}, ${item.id}, 'court', 'ec-1', 'CJM Bengaluru', 'Cheque bounce', 'Pending', 'high') returning id`;
    matchId = m.id;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Cases % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("shows matches and the search summary to the organisation only", async () => {
    const mine = await owner.client.from("case_matches").select("id, confidence").eq("id", matchId);
    expect(mine.data).toEqual([{ id: matchId, confidence: "high" }]);
    const summary = await owner.client.from("check_requests").select("tab, inputs_summary").eq("id", requestId);
    expect(summary.data?.[0]).toMatchObject({ tab: "case_check", inputs_summary: { district: "Bengaluru" } });
    const theirs = await outsider.client.from("case_matches").select("id").eq("id", matchId);
    expect(theirs.data).toEqual([]);
  });

  it("never gives the search details to the browser", async () => {
    const r = await owner.client.from("check_requests").select("inputs_ciphertext").eq("id", requestId);
    expect(r.error).not.toBeNull();
  });

  it("refuses reviews made directly by signed-in users", async () => {
    const upd = await owner.client.from("case_matches").update({ review: "confirmed" }).eq("id", matchId).select("id");
    expect(upd.data ?? []).toEqual([]);
    const [row] = await db`select review::text from public.case_matches where id = ${matchId}`;
    expect(row.review).toBe("pending");
  });
});
