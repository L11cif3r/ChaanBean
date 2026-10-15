import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { connect, hasDatabase } from "./support";

// Server modules (audit writer, job runner, storage) end to end against the development database, through the same
// DATABASE_URL connection the app uses.
const run = hasDatabase ? describe : describe.skip;

run("server modules", async () => {
  const { closeSql } = await import("@/server/db/sql");
  const { audit, systemActor } = await import("@/server/audit");
  const { enqueue, runDueJobs } = await import("@/server/jobs/runner");
  const { evidenceStore, rawResponseStore } = await import("@/server/storage");

  const db = connect(2);
  const tag = crypto.randomBytes(4).toString("hex");
  const jobs: string[] = [];

  afterAll(async () => {
    if (jobs.length) await db`delete from public.jobs where id in ${db(jobs)}`;
    await db`delete from app_private.stored_objects where bucket = 'raw-responses' and path like ${`test/${tag}/%`}`;
    await db.begin(async (tx) => {
      await tx`select set_config('app.retention_delete', 'on', true)`;
      await tx`delete from app_private.stored_objects where bucket = 'evidence' and path like ${`test/${tag}/%`}`;
    });
    await db.end();
    await closeSql();
  });

  it("audit() masks personal data before storing it", async () => {
    const org = crypto.randomUUID();
    await audit(systemActor(`test-${tag}`, org), {
      action: "test.mask",
      entity: "counterparty",
      after: { mobile: "9876543210", pan: "AAPFU0939F", city: "Pune" },
    });
    const [row] = await db`select after, actor_type::text, request_id from public.audit_log where org_id = ${org}`;
    expect(row.after).toEqual({ mobile: "98••••3210", pan: "AAPFU••••F", city: "Pune" });
    expect(row.actor_type).toBe("system");
    expect(row.request_id).toBe(`test-${tag}`);
  });

  it("runs a queued job to completion (audit.verify_chain)", async () => {
    const org = crypto.randomUUID();
    await audit(systemActor(`test-${tag}`, org), { action: "test.job_seed" });
    const id = await enqueue("audit.verify_chain", { orgId: org }, { kick: false, dedupeKey: `test-verify-${tag}` });
    jobs.push(id);
    const summary = await runDueJobs({ worker: `test-${tag}`, kinds: ["audit.verify_chain"] });
    expect(summary.claimed).toBeGreaterThanOrEqual(1);
    const [row] = await db`select status::text, attempts from public.jobs where id = ${id}`;
    expect(row).toEqual({ status: "done", attempts: 1 });
  });

  it("stores evidence once, refuses to change or delete it, and checks its hash on read", async () => {
    const path = `test/${tag}/sealed.pdf`;
    const ref = await evidenceStore.putOnce(path, new TextEncoder().encode("%PDF-1.7 test"), "application/pdf");
    await expect(evidenceStore.putOnce(path, new TextEncoder().encode("other"), "application/pdf")).rejects.toThrow(/cannot be replaced/);
    await expect(db`update app_private.stored_objects set bytes = '\\x00' where bucket = 'evidence' and path = ${path}`).rejects.toThrow(/write-once/);
    await expect(db`delete from app_private.stored_objects where bucket = 'evidence' and path = ${path}`).rejects.toThrow(/retention/);
    expect(new TextDecoder().decode(await evidenceStore.get(ref))).toBe("%PDF-1.7 test");
  });

  it("encrypts raw provider responses at rest", async () => {
    const path = `test/${tag}/gst.json`;
    const ref = await rawResponseStore.put(path, { gstin: "27AAPFU0939F1ZV", turnover: 123 });
    const [row] = await db`select convert_from(bytes, 'UTF8') as text from app_private.stored_objects where bucket = 'raw-responses' and path = ${path}`;
    expect(row.text).not.toContain("27AAPFU0939F1ZV");
    expect(row.text.startsWith("v1.env1.")).toBe(true);
    expect(await rawResponseStore.get(ref)).toEqual({ gstin: "27AAPFU0939F1ZV", turnover: 123 });
  });
});
