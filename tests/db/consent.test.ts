import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 7 database rules: consent status is visible to the organisation only, the link token and the buyer's mobile
// never reach the browser, the buyer's GST and bureau details are server-only, and the consent record is append-only.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("buyer consent (Part 7)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let consentId: string;

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "cn-owner", tag), makeUser(db, "cn-out", tag)]);
    org = await makeOrg(db, `ZZ TEST Consent A ${tag}`, owner.id, "owner");
    await makeOrg(db, `ZZ TEST Consent B ${tag}`, outsider.id, "owner");
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, contact_name, mobile_hash, mobile_ciphertext, mobile_masked, address)
      values (${org}, 'business_pan', 'ZZ TEST Buyer', ${`pan-${tag}`}, 'Contact Person', ${`mob-${tag}`}, 'v1.x', '98••••3213', '{}') returning id`;
    const [{ no }] = await db<{ no: string }[]>`select app_private.next_report_no() as no`;
    const [req] = await db<{ id: string }[]>`
      insert into public.check_requests (org_id, counterparty_id, report_no, run_mode) values (${org}, ${cp.id}, ${no}, 'together') returning id`;
    const [c] = await db<{ id: string }[]>`
      insert into public.consent_requests (org_id, counterparty_id, check_request_id, scope, purpose, channels, mobile_hash,
                                           mobile_ciphertext, mobile_masked, token_hash, token_ciphertext, link_base, expires_at)
      values (${org}, ${cp.id}, ${req.id}, ${["CW_GST_TURNOVER_4Y"]}, 'supply_on_credit', ${["sms"]}, ${`mob-${tag}`}, 'v1.x', '98••••3213',
              ${`tok-${tag}`}, 'v1.y', 'http://localhost:3000', now() + interval '72 hours') returning id`;
    consentId = c.id;
    await db`insert into app_private.consent_private (consent_id, gst_token_ciphertext) values (${c.id}, 'v1.secret')`;
    await db`
      insert into app_private.consent_events (consent_id, org_id, kind, scope, purpose)
      values (${c.id}, ${org}, 'sent', ${["CW_GST_TURNOVER_4Y"]}, 'supply_on_credit')`;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Consent % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("shows the consent status to the organisation only", async () => {
    const mine = await owner.client.from("consent_requests").select("id, status, mobile_masked").eq("id", consentId);
    expect(mine.data).toEqual([{ id: consentId, status: "pending", mobile_masked: "98••••3213" }]);
    const theirs = await outsider.client.from("consent_requests").select("id").eq("id", consentId);
    expect(theirs.data).toEqual([]);
  });

  it("never gives the link token or the buyer's mobile to the browser", async () => {
    const token = await owner.client.from("consent_requests").select("token_hash").eq("id", consentId);
    expect(token.error).not.toBeNull();
    const mobile = await owner.client.from("consent_requests").select("mobile_ciphertext").eq("id", consentId);
    expect(mobile.error).not.toBeNull();
  });

  it("refuses direct changes from signed-in users", async () => {
    const upd = await owner.client.from("consent_requests").update({ status: "approved" }).eq("id", consentId).select("id");
    expect(upd.data ?? []).toEqual([]);
    const [row] = await db`select status::text from public.consent_requests where id = ${consentId}`;
    expect(row.status).toBe("pending");
  });

  it("keeps the consent record append-only", async () => {
    await expect(db`update app_private.consent_events set kind = 'approved' where consent_id = ${consentId}`).rejects.toThrow(/append-only/);
    await expect(db`delete from app_private.consent_events where consent_id = ${consentId}`).rejects.toThrow(/append-only/);
  });
});
