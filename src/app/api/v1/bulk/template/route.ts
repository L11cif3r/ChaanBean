import { TEMPLATE_CSV } from "@/server/bulk/rows";
import { route } from "@/server/http";

// v4 6.1 template: company_name, gstin, cin, city, state, contact_name, contact_mobile, contact_email. Opens in Excel.
export const GET = route({ capability: "check.run" }, async () =>
  new Response(`﻿${TEMPLATE_CSV.replace(/\n/g, "\r\n")}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="chaanbean-company-list.csv"', "cache-control": "no-store" },
  }),
);
