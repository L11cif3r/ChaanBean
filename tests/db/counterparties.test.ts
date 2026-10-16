import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";
import { gstinChecksumChar } from "@/lib/validators";

// Part 4 database rules: no duplicate GSTIN, PAN or mobile within an organisation (FR-CP-04), row-level security
// (every member reads, nobody writes directly), and UPI lookups kept server-side.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("counterparties (Part 4)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let orgA: string;
  let orgB: string;
  const gstin = (() => {
    const base = `27AABCK${String(1000 + Math.floor(Math.random() * 9000))}K1Z`;
    return base + gstinChecksumChar(base);
  })();

  const add = (org: string, over: Record<string, unknown> = {}) => {
    const v = {
      type: "business_gstin", gstin, pan_hash: `pan-${tag}`, mobile_hash: `mob-${tag}`, legal_name: "ZZ TEST Buyer", ...over,
    } as Record<string, string | null>;
    return db`
      insert into public.counterparties (org_id, type, legal_name, gstin, pan_hash, pan_ciphertext, pan_masked, contact_name,
        mobile_hash, mobile_ciphertext, mobile_masked, address, created_by)
      values (${org}, ${v.type}::public.counterparty_type, ${v.legal_name}, ${v.gstin}, ${v.pan_hash}, 'v1.x', 'AABCK••••K',
        'Contact Person', ${v.mobile_hash}, 'v1.x', '98••••3213',
        ${db.json({ line: "12 MIDC", city: "Pune", state: "Maharashtra", pincode: "411019" })}, ${owner.id})
      returning id`;
  };

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "cp-owner", tag), makeUser(db, "cp-out", tag)]);
    orgA = await makeOrg(db, `ZZ TEST Counterparties A ${tag}`, owner.id, "owner");
    orgB = await makeOrg(db, `ZZ TEST Counterparties B ${tag}`, outsider.id, "owner");
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST Counterparties % ${tag}`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("refuses a second counterparty with the same GSTIN, PAN or mobile in one organisation", async () => {
    await add(orgA);
    await expect(add(orgA, { pan_hash: `pan2-${tag}`, mobile_hash: `mob2-${tag}` })).rejects.toThrow(/counterparties_org_gstin/);
    await expect(add(orgA, { type: "business_pan", gstin: null, mobile_hash: `mob3-${tag}` })).rejects.toThrow(/counterparties_org_pan/);
    await expect(add(orgA, { type: "business_pan", gstin: null, pan_hash: `pan4-${tag}` })).rejects.toThrow(/counterparties_org_mobile/);
  });

  it("allows the same buyer in another organisation", async () => {
    const [row] = await add(orgB);
    expect(row.id).toBeTruthy();
  });

  it("keeps the type rules: a GSTIN only for GST businesses, a PAN for the others", async () => {
    await expect(add(orgA, { type: "business_pan", pan_hash: null, gstin: null, mobile_hash: `mob5-${tag}` })).rejects.toThrow(/check/i);
    await expect(add(orgA, { type: "individual", pan_hash: `pan6-${tag}`, mobile_hash: `mob6-${tag}` })).rejects.toThrow(/check/i);
  });

  it("lets members read only their own organisation's counterparties and write none directly", async () => {
    const { data: mine } = await owner.client.from("counterparties").select("org_id");
    expect(new Set((mine ?? []).map((r) => r.org_id))).toEqual(new Set([orgA]));
    const { data: theirs } = await outsider.client.from("counterparties").select("org_id").eq("org_id", orgA);
    expect(theirs).toEqual([]);
    const ins = await owner.client.from("counterparties").insert({
      org_id: orgA, type: "business_pan", legal_name: "Direct Write", pan_hash: "x", contact_name: "X Y", mobile_hash: "y",
      mobile_ciphertext: "z", mobile_masked: "z", address: {},
    });
    expect(ins.error).not.toBeNull();
    const upd = await owner.client.from("counterparties").update({ legal_name: "Changed" }).eq("org_id", orgA).select("id");
    expect(upd.data ?? []).toEqual([]);
  });

  it("keeps UPI lookups out of reach of signed-in users", async () => {
    await db`insert into app_private.upi_checks (org_id, mobile_hash, status, upi_name, provider) values (${orgA}, ${`mob-${tag}`}, 'linked', 'RAMESH KUMAR', 'mock_upi')`;
    const { error } = await owner.client.schema("app_private" as never).from("upi_checks").select("*");
    expect(error).not.toBeNull();
  });
});
