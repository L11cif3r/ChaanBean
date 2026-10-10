import { handle } from "@/lib/call-automation/route";
import { syncCase } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, (ctx) => syncCase(ctx, id));
}
