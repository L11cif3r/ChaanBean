import { z } from "zod";
import { isIsoDate } from "@/lib/dates";
import { toJsonSafe } from "@/lib/money";
import { ledger, ledgerCsv } from "@/server/billing/service";
import { route } from "@/server/http";

// S19 marker 4: ledger entries by IST date range, as JSON or a CSV statement.
const date = z.string().refine(isIsoDate, "Enter a date as YYYY-MM-DD.").optional();
const query = z
  .object({ from: date, to: date, format: z.enum(["json", "csv"]).default("json") })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "The start date must be on or before the end date.", path: ["from"] });

export const GET = route({ capability: "billing.manage", query }, async ({ ctx, query }) => {
  const rows = await ledger(ctx.orgId!, { from: query.from, to: query.to, limit: query.format === "csv" ? 5000 : 200 });
  if (query.format === "json") return toJsonSafe({ entries: rows });
  const name = `chaanbean-ledger-${query.from ?? "start"}-to-${query.to ?? "today"}.csv`;
  return new Response(ledgerCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
});
