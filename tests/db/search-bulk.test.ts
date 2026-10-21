import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// PRD v4.0 sections 4, 6 and 7 in the database: MCA name search, buyers picked from MCA records, and who can see a
// multiple search.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("company search and multiple search (v4)", () => {
  let db: Db;
  let owner: TestUser;
  let outsider: TestUser;
  let org: string;
  let bulkId: string;
  const address = { line: "Registered office", city: "Bangalore", state: "Karnataka", pincode: "560001" };

  beforeAll(async () => {
    db = connect();
    [owner, outsider] = await Promise.all([makeUser(db, "v4-owner", tag), makeUser(db, "v4-out", tag)]);
    org = await makeOrg(db, `ZZ TEST v4 ${tag}`, owner.id, "owner");
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST %${tag}%`}`;
    await removeUsers(db, [owner?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("finds MCA companies by words of the name, best match first, with the state and Active filters", async () => {
    const [any] = await db<{ name: string; state: string }[]>`select name, state from public.mca_companies where status = 'Active' and length(name) > 12 limit 1`;
    if (!any) return; // no MCA import in this database
    const q = any.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const hits = await db<{ name: string; status: string; score: number }[]>`select name, status, score from app_private.search_mca(${q}, ${any.state}, true, null)`;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(50);
    expect(hits[0].score).toBe(1);
    expect(hits.every((h) => h.status === "Active")).toBe(true);
    expect(hits.map((h) => h.score)).toEqual([...hits.map((h) => h.score)].sort((a, b) => b - a));
    const { error } = await owner.client.rpc("search_mca" as never, { q } as never);
    expect(error).not.toBeNull(); // server only
    const { data } = await owner.client.from("mca_companies" as never).select("cin").limit(1);
    expect(data ?? []).toEqual([]);
  });

  it("keeps a company picked from MCA records with a CIN and no contact, and lets its GSTIN be linked later", async () => {
    const [cp] = await db<{ id: string }[]>`
      insert into public.counterparties (org_id, type, legal_name, cin, address, created_by)
      values (${org}, 'business_cin', 'ZZ Test Picked Private Limited', 'U52609KA2022PTC158514', ${db.json(address)}, ${owner.id}) returning id`;
    await expect(db`
      insert into public.counterparties (org_id, type, legal_name, cin, address, created_by)
      values (${org}, 'business_cin', 'Same CIN again', 'U52609KA2022PTC158514', ${db.json(address)}, ${owner.id})`).rejects.toThrow(/counterparties_org_cin/);
    await expect(db`
      insert into public.counterparties (org_id, type, legal_name, address, created_by)
      values (${org}, 'business_cin', 'No CIN', ${db.json(address)}, ${owner.id})`).rejects.toThrow(/cin_type_check/);
    await db`update public.counterparties set gstin = '29AAPFQ4691F2ZL', pan_hash = 'h', pan_ciphertext = 'v1.x', pan_masked = 'AA••••1F' where id = ${cp.id}`;
    await expect(db`
      insert into public.counterparties (org_id, type, legal_name, pan_hash, gstin, address, created_by)
      values (${org}, 'business_pan', 'PAN with GSTIN', 'h2', '29AAPFQ4691F2ZL', ${db.json(address)}, ${owner.id})`).rejects.toThrow(/gstin_type_check/);
  });

  it("shows a multiple search to its organisation only, read-only, without the file's contacts", async () => {
    const [b] = await db<{ id: string }[]>`
      insert into public.bulk_searches (org_id, created_by, source, rows_total) values (${org}, ${owner.id}, 'typed', 1) returning id`;
    bulkId = b.id;
    await db`
      insert into public.bulk_rows (bulk_id, org_id, row_no, input, contact_ciphertext, match_state)
      values (${bulkId}, ${org}, 1, ${db.json({ companyName: "Om" })}, 'v1.secret', 'needs_pick')`;
    const { data: mine } = await owner.client.from("bulk_rows").select("row_no, match_state").eq("bulk_id", bulkId);
    expect(mine).toEqual([{ row_no: 1, match_state: "needs_pick" }]);
    const { error: secret } = await owner.client.from("bulk_rows").select("contact_ciphertext").eq("bulk_id", bulkId);
    expect(secret).not.toBeNull();
    const { data: theirs } = await outsider.client.from("bulk_searches").select("id").eq("id", bulkId);
    expect(theirs).toEqual([]);
    await owner.client.from("bulk_searches").update({ status: "done" }).eq("id", bulkId);
    const [s] = await db`select status from public.bulk_searches where id = ${bulkId}`;
    expect(s.status).toBe("ready");
    await expect(db`update public.bulk_searches set status = 'paid' where id = ${bulkId}`).rejects.toThrow(/status_check/);
  });
});
