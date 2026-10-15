import "server-only";
import os from "node:os";
import crypto from "node:crypto";
import { after } from "next/server";
import { redactText } from "@/lib/mask";
import type { Json } from "@/server/db/types";
import { adminClient } from "@/server/supabase/admin";
import { jobHandler, registeredKinds, type JobRow } from "./registry";
import "./handlers";

// Background jobs (PRD 12.1 "job queue and scheduler"). Jobs are rows in public.jobs, claimed with SKIP LOCKED, so any
// number of workers can run at once. A job starts straight after the request that queued it (after()), and a
// scheduler calling POST /api/v1/jobs/run every minute sweeps up anything left over.

const WORKER = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;

export interface EnqueueOptions {
  runAt?: Date;
  /** Same key = same job; a second enqueue returns the existing job. */
  dedupeKey?: string;
  orgId?: string;
  maxAttempts?: number;
  /** Start the job right after the current request instead of waiting for the next sweep. Default true. */
  kick?: boolean;
}

export async function enqueue(kind: string, payload: Json = {}, opts: EnqueueOptions = {}): Promise<string> {
  const { data, error } = await adminClient().rpc("enqueue_job", {
    p_kind: kind,
    p_payload: payload,
    p_run_at: (opts.runAt ?? new Date()).toISOString(),
    p_dedupe_key: opts.dedupeKey,
    p_org: opts.orgId,
    p_max_attempts: opts.maxAttempts ?? 5,
  });
  if (error || !data) throw new Error(`Could not queue job ${kind}: ${error?.message ?? "no id"}`);
  if (opts.kick !== false && (!opts.runAt || opts.runAt <= new Date())) kickJobs();
  return data;
}

/** Runs due jobs after the current response is sent. Outside a request (tests, scripts) it runs them now. */
export function kickJobs() {
  try {
    after(() => runDueJobs({ worker: `${WORKER}-after`, max: 10 }).then(() => undefined));
  } catch {
    void runDueJobs({ worker: `${WORKER}-direct`, max: 10 }).catch(() => undefined);
  }
}

export interface RunSummary {
  requeued: number;
  claimed: number;
  done: number;
  failed: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, kind: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Job ${kind} timed out after ${ms} ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

async function runOne(job: JobRow): Promise<"done" | "failed"> {
  const db = adminClient();
  const def = jobHandler(job.kind);
  try {
    if (!def) throw new Error(`No handler registered for job kind ${job.kind}`);
    await withTimeout(def.run(def.parse(job.payload), job), def.timeoutMs ?? 60_000, job.kind);
    const { error } = await db.rpc("complete_job", { p_id: job.id });
    if (error) throw new Error(`complete_job: ${error.message}`);
    return "done";
  } catch (err) {
    const message = redactText(err instanceof Error ? err.message : String(err));
    const { data: status } = await db.rpc("fail_job", { p_id: job.id, p_error: message });
    console.error(`[jobs] ${job.kind} ${job.id} failed (attempt ${job.attempts}, now ${status ?? "unknown"}): ${message}`);
    return "failed";
  }
}

/**
 * Claims and runs due jobs in parallel. Safe to call from several places at once. A worker only claims kinds it has a
 * handler for, so an older deployment never picks up (and fails) jobs added by a newer one.
 */
export async function runDueJobs(opts: { worker?: string; max?: number; kinds?: string[] } = {}): Promise<RunSummary> {
  const db = adminClient();
  const { data: requeued } = await db.rpc("requeue_stale_jobs", {});
  const { data: jobs, error } = await db.rpc("claim_jobs", {
    p_worker: opts.worker ?? WORKER,
    p_max: opts.max ?? 25,
    p_kinds: opts.kinds ?? registeredKinds(),
  });
  if (error) throw new Error(`claim_jobs: ${error.message}`);
  const results = await Promise.all((jobs ?? []).map(runOne));
  return {
    requeued: requeued ?? 0,
    claimed: results.length,
    done: results.filter((r) => r === "done").length,
    failed: results.filter((r) => r === "failed").length,
  };
}
