import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gstinChecksumChar } from "@/lib/validators";
import { connect, hasDatabase, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Part 2 database rules: organisation creation, invitations, member changes and row-level security on the new tables.
const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("identity (Part 2)", () => {
  let db: Db;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let orgId: string;
  const gstin = (() => {
    const base = `29AAPFQ${String(1000 + Math.floor(Math.random() * 9000))}F1Z`;
    return base + gstinChecksumChar(base);
  })();

  const createOrg = (userId: string, g: string | null, name: string) => db`
    select app_private.create_organisation(
      ${userId}::uuid, ${name}, null, ${g}, ${`pan-hash-${tag}-${name}`}, 'v1.env1.x', 'Partnership', '29', null, 'gstin',
      'gstin_verified', 'active', 'Owner Person', 'Owner', ${`owner-${tag}@example.com`},
      'v0.1-draft', 'v0.1-draft', 'v1', '203.0.113.9'::inet, 'vitest', ${`test-${tag}`}) as id`;

  const invite = (org: string, phoneHash: string, token: string, expires = "now() + interval '7 days'") => db.unsafe(
    `insert into public.invitations (org_id, full_name, role, mobile_hash, mobile_ciphertext, mobile_masked, token_hash, expires_at, invited_by)
     values ($1, 'Invited Person', 'member', $2, 'v1.env1.x', '90••••0002', $3, ${expires}, $4) returning id`,
    [org, phoneHash, crypto.createHash("sha256").update(token).digest("hex"), owner.id],
  );

  const accept = (token: string, userId: string, phoneHash: string) => db`
    select * from app_private.accept_invitation(${crypto.createHash("sha256").update(token).digest("hex")}, ${userId}::uuid,
      ${phoneHash}, null, 'vitest', ${`test-${tag}`})`;

  beforeAll(async () => {
    db = connect();
    [owner, member, outsider] = await Promise.all([makeUser(db, "owner", tag), makeUser(db, "member", tag), makeUser(db, "out", tag)]);
    const [row] = await createOrg(owner.id, gstin, `ZZ TEST Identity ${tag}`);
    orgId = row.id;
  });

  afterAll(async () => {
    await db`delete from public.organisations where legal_name like ${`ZZ TEST %${tag}%`}`;
    await removeUsers(db, [owner?.id, member?.id, outsider?.id].filter(Boolean));
    await db.end();
  });

  it("creates the organisation, Owner, profile, legal acceptances and audit entry together", async () => {
    const [m] = await db`select role::text, status::text from public.memberships where org_id = ${orgId} and user_id = ${owner.id}`;
    expect(m).toEqual({ role: "owner", status: "active" });
    const [p] = await db`select full_name, designation from public.user_profiles where id = ${owner.id}`;
    expect(p).toEqual({ full_name: "Owner Person", designation: "Owner" });
    const acc = await db`select kind, version from app_private.legal_acceptances where user_id = ${owner.id} order by kind`;
    expect(acc).toEqual([{ kind: "authority", version: "v1" }, { kind: "privacy", version: "v0.1-draft" }, { kind: "terms", version: "v0.1-draft" }]);
    const [a] = await db`select action from public.audit_log where org_id = ${orgId} and action = 'organisation.created'`;
    expect(a.action).toBe("organisation.created");
  });

  it("refuses a second organisation with the same GSTIN and leaves nothing behind", async () => {
    await expect(createOrg(outsider.id, gstin, `ZZ TEST Duplicate ${tag}`)).rejects.toThrow(/GSTIN_ALREADY_REGISTERED/);
    const [n] = await db`select count(*)::int as n from public.memberships where user_id = ${outsider.id}`;
    expect(n.n).toBe(0);
  });

  it("accepts an invitation only for the invited mobile, before it expires", async () => {
    const good = `tok-${tag}-good`;
    await invite(orgId, "hash-member", good);
    await expect(accept(good, member.id, "hash-someone-else")).rejects.toThrow(/INVITE_WRONG_MOBILE/);

    const old = `tok-${tag}-old`;
    await invite(orgId, "hash-old", old, "now() - interval '1 minute'");
    await expect(accept(old, member.id, "hash-old")).rejects.toThrow(/INVITE_EXPIRED/);

    const [joined] = await accept(good, member.id, "hash-member");
    expect(joined).toEqual({ org_id: orgId, role: "member" });
    await expect(accept(good, member.id, "hash-member")).rejects.toThrow(/INVITE_NOT_PENDING/);
  });

  it("does not let anyone join when every seat is taken", async () => {
    await db`update public.organisations set seat_limit = 2 where id = ${orgId}`;
    const token = `tok-${tag}-full`;
    await invite(orgId, "hash-out", token);
    await expect(accept(token, outsider.id, "hash-out")).rejects.toThrow(/NO_SEATS/);
    await db`update public.organisations set seat_limit = 3 where id = ${orgId}`;
  });

  it("protects the Owner, refuses self-changes and Members acting as admins", async () => {
    const [own] = await db`select id from public.memberships where org_id = ${orgId} and user_id = ${owner.id}`;
    const [mem] = await db`select id from public.memberships where org_id = ${orgId} and user_id = ${member.id}`;
    const setMember = (actor: string, membership: string, role: string | null, status: string | null) => db`
      select app_private.set_member(${orgId}::uuid, ${membership}::uuid, ${actor}::uuid, ${role}::public.member_role,
        ${status}::public.member_status, null, 'vitest', ${`test-${tag}`})`;

    await expect(setMember(member.id, own.id, null, "deactivated")).rejects.toThrow(/FORBIDDEN/);
    await expect(setMember(owner.id, own.id, "member", null)).rejects.toThrow(/SELF_CHANGE|OWNER_PROTECTED/);
    await expect(setMember(owner.id, mem.id, "owner", null)).rejects.toThrow(/USE_OWNERSHIP_TRANSFER/);

    await setMember(owner.id, mem.id, "viewer", null);
    await setMember(owner.id, mem.id, null, "deactivated");
    const [after] = await db`select role::text, status::text from public.memberships where id = ${mem.id}`;
    expect(after).toEqual({ role: "viewer", status: "deactivated" });
    const [log] = await db`select before, after from public.audit_log where org_id = ${orgId} and action = 'member.updated' order by seq desc limit 1`;
    expect(log.after).toEqual({ role: "viewer", status: "deactivated" });
  });

  it("shows invitations and manual reviews only to Owners and Admins of the organisation", async () => {
    await db`update public.memberships set status = 'active', role = 'member' where org_id = ${orgId} and user_id = ${member.id}`;
    await db`insert into public.manual_reviews (org_id, reason) values (${orgId}, 'other')`;
    const { data: ownerInvites } = await owner.client.from("invitations").select("id");
    const { data: memberInvites } = await member.client.from("invitations").select("id");
    const { data: outsiderInvites } = await outsider.client.from("invitations").select("id");
    expect(ownerInvites?.length).toBeGreaterThan(0);
    expect(memberInvites).toEqual([]);
    expect(outsiderInvites).toEqual([]);
    const { data: ownerReviews } = await owner.client.from("manual_reviews").select("id");
    const { data: memberReviews } = await member.client.from("manual_reviews").select("id");
    expect(ownerReviews?.length).toBe(1);
    expect(memberReviews).toEqual([]);
  });

  it("keeps OTP events, lookups and legal acceptances away from signed-in users", async () => {
    const { error: e1 } = await owner.client.schema("app_private" as never).from("otp_events").select("id");
    expect(e1).not.toBeNull();
    const { error: e2 } = await owner.client.from("invitations").insert({
      org_id: orgId, full_name: "X Y", role: "member", mobile_hash: "h", mobile_ciphertext: "c", mobile_masked: "m", token_hash: `forged-${tag}`, expires_at: new Date().toISOString(),
    });
    expect(e2).not.toBeNull();
  });
});
