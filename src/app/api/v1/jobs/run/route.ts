import { route } from "@/server/http";
import { runDueJobs } from "@/server/jobs/runner";

// Called every minute by the scheduler (pg_cron + pg_net, or Vercel Cron) with `Authorization: Bearer $CRON_SECRET`.
// Sweeps jobs that were not started straight after their request.
export const maxDuration = 300;

export const POST = route({ auth: "cron" }, async () => {
  return runDueJobs({ worker: "cron", max: 50 });
});
