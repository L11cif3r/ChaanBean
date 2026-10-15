import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilityPairs } from "@/lib/permissions";
import { anonClient, connect, hasDatabase, makeOrg, makeUser, removeUsers, type Db, type TestUser } from "./support";

// Database tests against the development Supabase project. They create throwaway users and organisations named
// "ZZ TEST …" and delete them afterwards. Audit rows written here stay: the audit log is append-only by design.

const run = hasDatabase ? describe : describe.skip;
const tag = crypto.randomBytes(4).toString("hex");

run("foundation database", () => {
  let db: Db;
  let a: TestUser;
  let b: TestUser;
  let orgA: string;
  let orgB: string;
  const jobs: string[] = [];

  beforeAll(async () => {
    db = connect();
    [a, b] = await Promise.all([makeUser(db, "a", tag), makeUser(db, "b", tag)]);
    orgA = await makeOrg(db, `ZZ TEST Alpha Traders ${tag}`, a.id, "owner");
    orgB = await makeOrg(db, `ZZ TEST Beta Steel ${tag}`, b.id, "member");
    await db`insert into public.user_profiles (id, full_name) values (${a.id}, 'Alpha Owner'), (${b.id}, 'Beta Member')`;
    await db`insert into public.audit_log (org_id, actor_type, action) values (${orgA}, 'system', 'test.seed'), (${orgB}, 'system', 'test.seed')`;
  });

  afterAll(async () => {
    if (jobs.length) await db`delete from public.jobs where id in ${db(jobs)}`;
    await db`delete from public.organisations where legal_name like ${`ZZ TEST % ${tag}`}`;
    await removeUsers(db, [a?.id, b?.id].filter(Boolean));
    await db.end();
  });

  it("keeps the TypeScript permission matrix identical to the database (PRD 4.3)", async () => {
    const rows = await db<{ role: string; capability: string }[]>`select role::text, capability from public.role_capability_matrix()`;
    const key = (p: { role: string; capability: string }) => `${p.role}:${p.capability}`;
    expect(new Set(rows.map(key))).toEqual(new Set(capabilityPairs().map(key)));
  });

  describe("row-level security through the Supabase API (tenant isolation, section 15)", () => {
    it("shows each signed-in user only their own organisation", async () => {
      const { data: seenByA } = await a.client.from("organisations").select("id");
      const { data: seenByB } = await b.client.from("organisations").select("id");
      expect(seenByA?.map((o) => o.id)).toEqual([orgA]);
      expect(seenByB?.map((o) => o.id)).toEqual([orgB]);
    });

    it("shows memberships and profiles only inside the user's organisations", async () => {
      const { data: memberships } = await a.client.from("memberships").select("org_id, user_id");
      const { data: profiles } = await a.client.from("user_profiles").select("full_name");
      expect(memberships).toEqual([{ org_id: orgA, user_id: a.id }]);
      expect(profiles).toEqual([{ full_name: "Alpha Owner" }]);
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
      const [m] = await db<{ role: string }[]>`select role::text from public.memberships where org_id = ${orgB}`;
      expect(m.role).toBe("member");
    });

    it("gives anonymous callers nothing and keeps server functions out of reach", async () => {
      const anon = anonClient();
      const { data: orgs } = await anon.from("organisations").select("id");
      expect(orgs ?? []).toEqual([]);
      const { error: claim } = await a.client.rpc("claim_jobs", { p_worker: "attacker", p_max: 10 });
      const { error: matrix } = await a.client.rpc("role_capability_matrix");
      const { error: verify } = await a.client.rpc("verify_audit_chain", { p_org: orgA });
      expect(claim).not.toBeNull();
      expect(matrix).not.toBeNull();
      expect(verify).not.toBeNull();
    });
  });

  describe("audit log (FR-AUD-01)", () => {
    it("chains every row and verifies intact", async () => {
      const org = crypto.randomUUID();
      for (let i = 1; i <= 3; i++) {
        await db`insert into public.audit_log (org_id, actor_type, action, after) values (${org}, 'system', 'test.chain', ${db.json({ i })})`;
      }
      const rows = await db<{ seq: string; prev_hash: string; row_hash: string }[]>`
        select seq, prev_hash, row_hash from public.audit_log where org_id = ${org} order by seq`;
      expect(rows.map((r) => Number(r.seq))).toEqual([1, 2, 3]);
      expect(rows[0].prev_hash).toBe("GENESIS");
      expect(rows[1].prev_hash).toBe(rows[0].row_hash);
      const [v] = await db`select broken_seq, checked from public.verify_audit_chain(${org})`;
      expect(v.broken_seq).toBeNull();
      expect(Number(v.checked)).toBe(3);
    });

    it("cannot be edited or deleted, even by the database owner", async () => {
      await expect(db`update public.audit_log set action = 'test.tampered' where org_id = ${orgA}`).rejects.toThrow(/append-only/);
      await expect(db`delete from public.audit_log where org_id = ${orgA}`).rejects.toThrow(/append-only/);
    });

    it("detects a row changed behind its back", async () => {
      const org = crypto.randomUUID();
      await db.begin(async (tx) => {
        for (let i = 1; i <= 3; i++) await tx`insert into public.audit_log (org_id, actor_type, action, after) values (${org}, 'system', 'test.tamper', ${tx.json({ i })})`;
        await tx`alter table public.audit_log disable trigger audit_log_no_update`;
        await tx`update public.audit_log set after = ${tx.json({ i: 99 })} where org_id = ${org} and seq = 2`;
        const [v] = await tx`select broken_seq from public.verify_audit_chain(${org})`;
        expect(Number(v.broken_seq)).toBe(2);
        throw new Error("rollback");
      }).catch((e) => {
        if (e.message !== "rollback") throw e;
      });
      const [t] = await db`select tgenabled from pg_trigger where tgname = 'audit_log_no_update'`;
      expect(t.tgenabled).toBe("O");
    });

    it("keeps the chain intact with 8 writers on separate connections at once", async () => {
      const org = crypto.randomUUID();
      const started = Date.now();
      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          db.begin(async (tx) => {
            await tx`insert into public.audit_log (org_id, actor_type, action, after) values (${org}, 'system', 'test.concurrent', ${tx.json({ writer: i })})`;
            await tx`select pg_sleep(0.25)`; // hold the transaction so the writers really overlap
          }),
        ),
      );
      const elapsed = Date.now() - started;
      const [v] = await db`select broken_seq, checked from public.verify_audit_chain(${org})`;
      expect(v.broken_seq).toBeNull();
      expect(Number(v.checked)).toBe(8);
      // The per-organisation lock makes writers wait for each other: 8 × 0.25 s at least.
      expect(elapsed).toBeGreaterThanOrEqual(1900);
    });
  });

  describe("job queue", () => {
    const kind = `test.q${tag}`;

    it("deduplicates by key", async () => {
      const [first] = await db`select public.enqueue_job(${kind}, '{}'::jsonb, now() + interval '1 hour', ${`dedupe-${tag}`}) as id`;
      const [second] = await db`select public.enqueue_job(${kind}, '{}'::jsonb, now(), ${`dedupe-${tag}`}) as id`;
      jobs.push(first.id);
      expect(second.id).toBe(first.id);
    });

    it("never gives the same job to two workers claiming at the same time", async () => {
      const ids: string[] = [];
      for (let i = 0; i < 6; i++) {
        const [r] = await db`select public.enqueue_job(${`${kind}.c`}) as id`;
        ids.push(r.id);
      }
      jobs.push(...ids);
      // Three workers on separate connections, each holding its transaction (and its row locks) open.
      const claims = await Promise.all(
        ["w1", "w2", "w3"].map((w) =>
          db.begin(async (tx) => {
            const rows = await tx<{ id: string }[]>`select id from public.claim_jobs(${w}, 3, array[${`${kind}.c`}])`;
            await tx`select pg_sleep(0.5)`;
            return rows.map((r) => r.id);
          }),
        ),
      );
      const claimed = claims.flat();
      expect(claimed.sort()).toEqual([...ids].sort());
      expect(new Set(claimed).size).toBe(6);
      expect(claims.map((c) => c.length).sort()).toEqual([0, 3, 3]);
    });

    it("retries a failed job with backoff and gives up after max attempts", async () => {
      const [{ id }] = await db`select public.enqueue_job(${`${kind}.f`}, '{}'::jsonb, now(), null, null, 2) as id`;
      jobs.push(id);
      await db`select * from public.claim_jobs('w', 1, array[${`${kind}.f`}])`;
      const [first] = await db`select public.fail_job(${id}, 'boom')::text as s`;
      expect(first.s).toBe("queued");
      const [row] = await db`select extract(epoch from run_at - now()) as wait from public.jobs where id = ${id}`;
      expect(Number(row.wait)).toBeGreaterThan(20);
      await db`update public.jobs set run_at = now() where id = ${id}`;
      await db`select * from public.claim_jobs('w', 1, array[${`${kind}.f`}])`;
      const [second] = await db`select public.fail_job(${id}, 'boom again')::text as s`;
      expect(second.s).toBe("dead");
    });
  });
});
