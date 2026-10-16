import { z } from "zod";
import { invoiceHtml } from "@/server/billing/invoice-html";
import { getInvoice } from "@/server/billing/service";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";

// S19: one GST invoice as a printable page (Save as PDF).
export const GET = route({ capability: "billing.manage" }, async ({ ctx, params }) => {
  const id = z.uuid().safeParse(params.id);
  if (!id.success) throw notFound("This invoice");
  const html = invoiceHtml(await getInvoice(ctx.orgId!, id.data));
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
});
