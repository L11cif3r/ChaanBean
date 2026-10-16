import { getTranslations } from "next-intl/server";
import { getReport } from "@/server/checks/service";
import { reportHtml } from "@/server/checks/report-html";
import { orgCtx } from "@/server/counterparties/routes";
import { audit } from "@/server/audit";
import { route } from "@/server/http";

// FR-RPT-04: the report as a branded printable page (the browser saves it as PDF). Every export is logged.
export const GET = route({ capability: "report.export" }, async ({ ctx, params }) => {
  const c = orgCtx(ctx);
  const report = await getReport(c, String(params.id));
  const t = await getTranslations({ locale: "en-IN", namespace: "report" });
  await audit(c, { action: "report.exported", entity: "check_request", entityId: report.id, after: { reportNo: report.reportNo } });
  return new Response(reportHtml(report, (key, values) => t(key as never, values as never)), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
  });
});
