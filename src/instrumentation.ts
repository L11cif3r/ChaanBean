// Next.js calls register() once when a server instance starts.
// Local development: with APP_LOCAL_JOBS=true the job sweeper runs inside `next dev` (src/server/jobs/local.ts).
export async function register() {
  // This exact check lets the edge build drop the import (jobs need Node: database, crypto).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startLocalJobs } = await import("./server/jobs/local");
    startLocalJobs();
  }
}
