import "server-only";
import { runDueJobs } from "./runner";

// In-process job sweeper for local development only (started from src/instrumentation.ts when APP_LOCAL_JOBS=true).
// Production uses a scheduler calling POST /api/v1/jobs/run instead.

const g = globalThis as unknown as { __cbLocalJobs?: boolean };

export function startLocalJobs() {
  if (process.env.NODE_ENV === "production" || process.env.APP_LOCAL_JOBS !== "true") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[jobs] local jobs not started: DATABASE_URL is missing (.env)");
    return;
  }
  if (g.__cbLocalJobs) return; // hot reload calls register() again
  g.__cbLocalJobs = true;
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await runDueJobs({ worker: "local-dev" });
      if (r.claimed || r.requeued) console.log("[jobs]", JSON.stringify(r));
    } catch (e) {
      console.error("[jobs] sweep failed:", e instanceof Error ? e.message : e);
    } finally {
      running = false;
    }
  }, 15_000);
  console.log("[jobs] local job sweeper running every 15 s");
}
