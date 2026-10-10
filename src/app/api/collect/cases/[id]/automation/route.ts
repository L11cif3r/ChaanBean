import { z } from "zod";
import { handle } from "@/lib/call-automation/route";
import { configureAutomation, controlAutomation } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

/** Enable / reconfigure automation. */
export async function POST(req: Request, { params }: P) {
  const { id } = await params;
  return handle(req, async (ctx, body) => ({ case: await configureAutomation(ctx, id, await body()) }));
}

/** Pause, resume or stop. */
export async function PATCH(req: Request, { params }: P) {
  const { id } = await params;
  return handle(req, async (ctx, body) => {
    const { op } = z.object({ op: z.enum(["PAUSE", "RESUME", "STOP"]) }).parse(await body());
    return { case: await controlAutomation(ctx, id, op) };
  });
}
