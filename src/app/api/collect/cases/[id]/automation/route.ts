import { z } from "zod";
import { handle } from "@/lib/call-automation/route";
import { configureAutomation, controlAutomation, updateAutomation } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

/** Enable (or re-enable) automation with validated settings. */
export async function POST(req: Request, { params }: P) {
  const { id } = await params;
  return handle(req, async (ctx, body) => ({ case: await configureAutomation(ctx, id, await body()) }));
}

/** Pause, resume, stop, or update the schedule's frequency / attempt limit. */
export async function PATCH(req: Request, { params }: P) {
  const { id } = await params;
  return handle(req, async (ctx, body) => {
    const b = await body();
    const { op } = z.object({ op: z.enum(["PAUSE", "RESUME", "STOP", "UPDATE"]) }).passthrough().parse(b);
    return { case: op === "UPDATE" ? await updateAutomation(ctx, id, b) : await controlAutomation(ctx, id, op) };
  });
}
