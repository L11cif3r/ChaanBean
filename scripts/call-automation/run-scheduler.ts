// Local scheduler runner: `npx tsx scripts/call-automation/run-scheduler.ts [--loop] [--interval=30] [--now=<ISO>]`
// One tick = reconcile missing callbacks, then dispatch due schedules. Uses CALL_PROVIDER (default: mock).
import "dotenv/config";
import { reconcileOpenAttempts, runDueSchedules } from "../../src/lib/call-automation/engine";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const loop = process.argv.includes("--loop");
const interval = Number(arg("interval") ?? 30);
// --now simulates a clock (e.g. inside calling hours) for local demos; the cron route never uses it.
const fixedNow = arg("now");
const clock = () => (fixedNow ? new Date(fixedNow) : new Date());

async function tick() {
  const reconcile = await reconcileOpenAttempts(new Date(), { minAgeSeconds: 3 });
  const schedule = await runDueSchedules(clock());
  console.log(new Date().toISOString(), JSON.stringify({ schedule, reconcile }));
}

(async () => {
  do {
    try {
      await tick();
    } catch (e) {
      console.error("tick failed:", e instanceof Error ? e.message : e);
    }
    if (loop) await new Promise((r) => setTimeout(r, interval * 1000));
  } while (loop);
  process.exit(0);
})();
