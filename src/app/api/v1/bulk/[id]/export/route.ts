import { exportBulk } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { xlsx } from "@/server/xlsx";

// FR-QS-04: the results as an Excel file.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => {
  const { name, rows } = await exportBulk(orgCtx(ctx), String(params.id));
  return new Response(Buffer.from(xlsx("Multiple search", rows)), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
});
