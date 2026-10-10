import { handle } from "@/lib/call-automation/route";
import { getCaseDetail } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, (ctx) => getCaseDetail(ctx, id));
}
