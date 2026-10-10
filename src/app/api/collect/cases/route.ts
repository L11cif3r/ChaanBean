import { handle } from "@/lib/call-automation/route";
import { getProvider } from "@/lib/call-automation/providers";
import { createCase, listCases } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  return handle(req, async (ctx) => {
    const provider = getProvider();
    return { cases: await listCases(ctx, { status }), provider: { name: provider.name, ...provider.isReady() } };
  });
}

export async function POST(req: Request) {
  return handle(req, async (ctx, body) => ({ case: await createCase(ctx, await body()) }), 201);
}
