import { handle } from "@/lib/call-automation/route";
import { syncInvoiceAs } from "@/lib/call-automation/service";

export const dynamic = "force-dynamic";

/** Idempotent invoice -> collection case sync. Safe to call repeatedly as the invoice's outstanding amount changes. */
export async function POST(req: Request) {
  return handle(req, async (ctx, body) => syncInvoiceAs(ctx, await body()));
}
