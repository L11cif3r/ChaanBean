import "server-only";
import os from "node:os";
import crypto from "node:crypto";
import { after } from "next/server";
import type { JSONValue } from "postgres";
import { redactText } from "@/lib/mask";
import { sql } from "@/server/db/sql";
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

export async function enqueue(kind: string, payload: JSONValue = {}, opts: EnqueueOptions = {}): Promise<string> {
  const db = sql();
  const [row] = await db<{ id: string }[]>`
    select public.enqueue_job(
      ${kind}::text, ${db.json(payload)}::jsonb, ${opts.runAt ?? new Date()}::timestamptz,
      ${opts.dedupeKey ?? null}::text, ${opts.orgId ?? null}::uuid, ${opts.maxAttempts ?? 5}::int
    ) as id`;
  if (!row?.id) throw new Error(`Could not queue job ${kind}`);
  if (opts.kick !== false && (!opts.runAt || opts.runAt <= new Date())) kickJobs();
  // A job due within a few seconds (the v4 cancel window) runs right on time instead of waiting for the next sweep.
  else if (opts.kick !== false && opts.runAt && opts.runAt.getTime() - Date.now() <= 20_000) kickJobs(opts.runAt.getTime() - Date.now() + 150);
  return row.id;
}

/** Runs due jobs after the current response is sent. Outside a request (tests, scripts) it runs them now. */
export function kickJobs(delayMs = 0) {
  const wait = () => (delayMs > 0 ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve());
  try {
    after(() => wait().then(() => runDueJobs({ worker: `${WORKER}-after`, max: 10 })).then(() => undefined));
  } catch {
    void wait().then(() => runDueJobs({ worker: `${WORKER}-direct`, max: 10 })).catch(() => undefined);
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
  const db = sql();
  const def = jobHandler(job.kind);
  try {
    if (!def) throw new Error(`No handler registered for job kind ${job.kind}`);
    await withTimeout(def.run(def.parse(job.payload), job), def.timeoutMs ?? 60_000, job.kind);
    await db`select public.complete_job(${job.id}::uuid)`;
    return "done";
  } catch (err) {
    const message = redactText(err instanceof Error ? err.message : String(err));
    const [res] = await db<{ status: string }[]>`select public.fail_job(${job.id}::uuid, ${message}::text) as status`;
    console.error(`[jobs] ${job.kind} ${job.id} failed (attempt ${job.attempts}, now ${res?.status ?? "unknown"}): ${message}`);
    return "failed";
  }
}

/**
 * Claims and runs due jobs in parallel. Safe to call from several places at once. A worker only claims kinds it has a
 * handler for, so an older deployment never picks up (and fails) jobs added by a newer one.
 */
export async function runDueJobs(opts: { worker?: string; max?: number; kinds?: string[] } = {}): Promise<RunSummary> {
  const db = sql();
  const kinds = (opts.kinds ?? registeredKinds()).join(",");
  const [{ n: requeued }] = await db<{ n: number }[]>`select public.requeue_stale_jobs() as n`;
  const jobs = await db<JobRow[]>`
    select id, kind, payload, org_id, attempts, max_attempts, run_at
      from public.claim_jobs(${opts.worker ?? WORKER}::text, ${opts.max ?? 25}::int, string_to_array(${kinds}::text, ','))`;
  const results = await Promise.all(jobs.map(runOne));
  return {
    requeued,
    claimed: results.length,
    done: results.filter((r) => r === "done").length,
    failed: results.filter((r) => r === "failed").length,
  };
}
