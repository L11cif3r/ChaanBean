import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

// Server modules (audit writer, job runner, storage) against Supabase staging.
const run = process.env.SUPABASE_SECRET_KEY ? describe : describe.skip;

run("server modules", async () => {
  const { adminClient } = await import("@/server/supabase/admin");
  const { audit, systemActor } = await import("@/server/audit");
  const { enqueue, runDueJobs } = await import("@/server/jobs/runner");
  const { evidenceStore, rawResponseStore } = await import("@/server/storage");

  const tag = crypto.randomBytes(4).toString("hex");
  const cleanup = { jobs: [] as string[], objects: [] as [string, string][] };

  afterAll(async () => {
    const db = adminClient();
    if (cleanup.jobs.length) await db.from("jobs").delete().in("id", cleanup.jobs);
    for (const [bucket, path] of cleanup.objects) await db.storage.from(bucket).remove([path]);
  });

  it("audit() masks personal data before storing it", async () => {
    const org = crypto.randomUUID();
    await audit(systemActor(`test-${tag}`, org), {
      action: "test.mask",
      entity: "counterparty",
      after: { mobile: "9876543210", pan: "AAPFU0939F", city: "Pune" },
    });
    const { data } = await adminClient().from("audit_log").select("after, actor_type, request_id").eq("org_id", org).single();
    expect(data?.after).toEqual({ mobile: "98••••3210", pan: "AAPFU••••F", city: "Pune" });
    expect(data?.actor_type).toBe("system");
    expect(data?.request_id).toBe(`test-${tag}`);
  });

  it("runs a queued job to completion (audit.verify_chain)", async () => {
    const org = crypto.randomUUID();
    await audit(systemActor(`test-${tag}`, org), { action: "test.job_seed" });
    const id = await enqueue("audit.verify_chain", { orgId: org }, { kick: false, dedupeKey: `test-verify-${tag}` });
    cleanup.jobs.push(id);
    const summary = await runDueJobs({ worker: `test-${tag}`, kinds: ["audit.verify_chain"] });
    expect(summary.claimed).toBeGreaterThanOrEqual(1);
    const { data } = await adminClient().from("jobs").select("status, attempts").eq("id", id).single();
    expect(data).toEqual({ status: "done", attempts: 1 });
  });

  it("stores evidence once and refuses to overwrite it", async () => {
    const path = `test/${tag}/sealed.pdf`;
    const bytes = new TextEncoder().encode("%PDF-1.7 test");
    const ref = await evidenceStore.putOnce(path, bytes, "application/pdf");
    cleanup.objects.push(["evidence", path]);
    await expect(evidenceStore.putOnce(path, bytes, "application/pdf")).rejects.toThrow();
    expect(new TextDecoder().decode(await evidenceStore.get(ref))).toBe("%PDF-1.7 test");
  });

  it("encrypts raw provider responses at rest", async () => {
    const path = `test/${tag}/gst.txt`;
    const ref = await rawResponseStore.put(path, { gstin: "27AAPFU0939F1ZV", turnover: 123 });
    cleanup.objects.push(["raw-responses", path]);
    const { data } = await adminClient().storage.from("raw-responses").download(path);
    const stored = await data!.text();
    expect(stored).not.toContain("27AAPFU0939F1ZV");
    expect(await rawResponseStore.get(ref)).toEqual({ gstin: "27AAPFU0939F1ZV", turnover: 123 });
  });
});
