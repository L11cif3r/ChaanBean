import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/server/db/types";
import { capabilityPairs } from "@/lib/permissions";

// Database tests against the development Supabase project. They create throwaway users and organisations named "ZZ TEST …"
// and delete them afterwards. Audit rows written here stay: the audit log is append-only by design.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY;
const run = secret ? describe : describe.skip;
if (!secret) console.warn("SUPABASE_SECRET_KEY is not set in .env.local: database tests skipped");

type Db = SupabaseClient<Database>;
const tag = crypto.randomBytes(4).toString("hex");
const admin: Db = createClient<Database>(url, secret ?? "missing", { auth: { persistSession: false } });

interface TestUser {
  id: string;
  email: string;
  client: Db;
}

const created = { users: [] as string[], orgs: [] as string[], jobs: [] as string[], objects: [] as [string, string][] };

async function makeUser(label: string): Promise<TestUser> {
  const email = `zz-test-${label}-${tag}@chaanbean.test`;
  const password = crypto.randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  created.users.push(data.user.id);
  const client = createClient<Database>(url, publishable, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

async function makeOrg(name: string, ownerId: string, role: Database["public"]["Enums"]["member_role"]) {
  const { data, error } = await admin.from("organisations").insert({ legal_name: `ZZ TEST ${name} ${tag}`, created_by: ownerId }).select("id").single();
  if (error) throw error;
  created.orgs.push(data.id);
  const { error: mErr } = await admin.from("memberships").insert({ org_id: data.id, user_id: ownerId, role, status: "active", joined_at: new Date().toISOString() });
  if (mErr) throw mErr;
  return data.id as string;
}

run("foundation database", () => {
  let a: TestUser;
  let b: TestUser;
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    [a, b] = await Promise.all([makeUser("a"), makeUser("b")]);
    [orgA, orgB] = await Promise.all([makeOrg("Alpha Traders", a.id, "owner"), makeOrg("Beta Steel", b.id, "member")]);
    await admin.from("audit_log").insert([
      { org_id: orgA, actor_type: "system", action: "test.seed", entity: "organisation", entity_id: orgA },
      { org_id: orgB, actor_type: "system", action: "test.seed", entity: "organisation", entity_id: orgB },
    ]);
  });

  afterAll(async () => {
    if (created.jobs.length) await admin.from("jobs").delete().in("id", created.jobs);
    for (const [bucket, path] of created.objects) await admin.storage.from(bucket).remove([path]);
    if (created.orgs.length) await admin.from("organisations").delete().in("id", created.orgs);
    for (const id of created.users) await admin.auth.admin.deleteUser(id);
  });

  it("keeps the TypeScript permission matrix identical to the database (PRD 4.3)", async () => {
    const { data, error } = await admin.rpc("role_capability_matrix");
    expect(error).toBeNull();
    const key = (p: { role: string; capability: string }) => `${p.role}:${p.capability}`;
    expect(new Set((data ?? []).map(key))).toEqual(new Set(capabilityPairs().map(key)));
  });

  describe("row-level security (tenant isolation, section 15)", () => {
    it("shows each user only their own organisation", async () => {
      const { data: seenByA } = await a.client.from("organisations").select("id");
      const { data: seenByB } = await b.client.from("organisations").select("id");
      expect(seenByA?.map((o) => o.id)).toEqual([orgA]);
      expect(seenByB?.map((o) => o.id)).toEqual([orgB]);
    });

    it("shows memberships and profiles only inside the user's organisations", async () => {
      const { data } = await a.client.from("memberships").select("org_id, user_id");
      expect(data).toEqual([{ org_id: orgA, user_id: a.id }]);
    });

    it("lets Owners read their audit log and hides it from Members (audit.view)", async () => {
      const { data: ownerView } = await a.client.from("audit_log").select("org_id");
      const { data: memberView } = await b.client.from("audit_log").select("org_id");
      expect(ownerView?.length).toBeGreaterThan(0);
      expect(new Set(ownerView?.map((r) => r.org_id))).toEqual(new Set([orgA]));
      expect(memberView).toEqual([]);
    });

    it("refuses direct writes from signed-in users", async () => {
      const { error: insertOrg } = await a.client.from("organisations").insert({ legal_name: "ZZ TEST should fail" });
      const { error: escalate } = await b.client.from("memberships").update({ role: "owner" }).eq("org_id", orgB);
      const { error: forgeAudit } = await a.client.from("audit_log").insert({ org_id: orgA, actor_type: "user", action: "test.forged" });
      expect(insertOrg).not.toBeNull();
      expect(escalate).not.toBeNull();
      expect(forgeAudit).not.toBeNull();
      const { data: role } = await admin.from("memberships").select("role").eq("org_id", orgB).single();
      expect(role?.role).toBe("member");
    });

    it("gives anonymous callers nothing and keeps job functions server-only", async () => {
      const anon = createClient<Database>(url, publishable, { auth: { persistSession: false } });
      const { data: orgs } = await anon.from("organisations").select("id");
      expect(orgs ?? []).toEqual([]);
      const { error: claim } = await a.client.rpc("claim_jobs", { p_worker: "attacker", p_max: 10 });
      const { error: matrix } = await a.client.rpc("role_capability_matrix");
      expect(claim).not.toBeNull();
      expect(matrix).not.toBeNull();
    });
  });

  describe("audit log (FR-AUD-01)", () => {
    it("chains every row and verifies intact", async () => {
      const org = crypto.randomUUID();
      for (let i = 1; i <= 3; i++) {
        const { error } = await admin.from("audit_log").insert({ org_id: org, actor_type: "system", action: "test.chain", after: { i } });
        expect(error).toBeNull();
      }
      const { data: rows } = await admin.from("audit_log").select("seq, prev_hash, row_hash").eq("org_id", org).order("seq");
      expect(rows?.map((r) => r.seq)).toEqual([1, 2, 3]);
      expect(rows?.[0].prev_hash).toBe("GENESIS");
      expect(rows?.[1].prev_hash).toBe(rows?.[0].row_hash);
      const { data: verdict } = await admin.rpc("verify_audit_chain", { p_org: org });
      expect(verdict?.[0]).toEqual({ broken_seq: null, checked: 3 });
    });

    it("cannot be edited or deleted, even with the secret key", async () => {
      const { error: upd } = await admin.from("audit_log").update({ action: "test.tampered" }).eq("org_id", orgA);
      const { error: del } = await admin.from("audit_log").delete().eq("org_id", orgA);
      expect(upd?.message).toMatch(/append-only/);
      expect(del?.message).toMatch(/append-only/);
    });

    it("keeps the chain consistent under concurrent writers", async () => {
      const org = crypto.randomUUID();
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) => admin.from("audit_log").insert({ org_id: org, actor_type: "system", action: "test.concurrent", after: { i } })),
      );
      expect(results.every((r) => !r.error)).toBe(true);
      const { data: verdict } = await admin.rpc("verify_audit_chain", { p_org: org });
      expect(verdict?.[0]).toEqual({ broken_seq: null, checked: 8 });
    });
  });

  describe("job queue", () => {
    const kind = `test.q${tag}`;

    it("deduplicates by key", async () => {
      const key = `test-dedupe-${tag}`;
      const { data: first } = await admin.rpc("enqueue_job", { p_kind: kind, p_dedupe_key: key, p_run_at: new Date(Date.now() + 3600_000).toISOString() });
      const { data: second } = await admin.rpc("enqueue_job", { p_kind: kind, p_dedupe_key: key });
      created.jobs.push(first!);
      expect(second).toBe(first);
    });

    it("never gives the same job to two workers", async () => {
      const ids = await Promise.all(
        Array.from({ length: 6 }, async () => (await admin.rpc("enqueue_job", { p_kind: `${kind}.c` })).data!),
      );
      created.jobs.push(...ids);
      const claims = await Promise.all(["w1", "w2", "w3"].map((w) => admin.rpc("claim_jobs", { p_worker: w, p_max: 6, p_kinds: [`${kind}.c`] })));
      const claimed = claims.flatMap((c) => (c.data ?? []).map((j) => j.id));
      expect(claimed.sort()).toEqual([...ids].sort());
      expect(new Set(claimed).size).toBe(claimed.length);
    });

    it("retries a failed job with backoff and gives up after max attempts", async () => {
      const { data: id } = await admin.rpc("enqueue_job", { p_kind: `${kind}.f`, p_max_attempts: 2 });
      created.jobs.push(id!);
      await admin.rpc("claim_jobs", { p_worker: "w", p_kinds: [`${kind}.f`] });
      const { data: first } = await admin.rpc("fail_job", { p_id: id!, p_error: "boom" });
      expect(first).toBe("queued");
      const { data: row } = await admin.from("jobs").select("run_at").eq("id", id!).single();
      expect(new Date(row!.run_at).getTime() - Date.now()).toBeGreaterThan(20_000);
      await admin.from("jobs").update({ run_at: new Date().toISOString() }).eq("id", id!);
      await admin.rpc("claim_jobs", { p_worker: "w", p_kinds: [`${kind}.f`] });
      const { data: second } = await admin.rpc("fail_job", { p_id: id!, p_error: "boom again" });
      expect(second).toBe("dead");
    });
  });
});
