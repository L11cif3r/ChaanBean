import { exportCounterparties } from "@/server/counterparties/service";
import { listQuery, orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S05 marker 3: CSV of the filtered list, Owner and Admin only (org.edit is their capability in the 4.3 matrix).
export const GET = route({ capability: "org.edit", query: listQuery }, async ({ ctx, query }) => {
  const csv = await exportCounterparties(orgCtx(ctx), query);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="chaanbean-counterparties-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
});
