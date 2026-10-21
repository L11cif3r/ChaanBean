import { z } from "zod";
import { searchCompanies } from "@/server/companies/search";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v4 section 4: search by company name, GSTIN or CIN/LLPIN. Free (FR-SR-08).
const query = z.object({
  q: z.string().max(120),
  state: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  active_only: z.enum(["true", "false"]).optional(),
});

export const GET = route({ capability: "dashboard.view", query }, async ({ ctx, query }) =>
  searchCompanies(orgCtx(ctx), { q: query.q, state: query.state, city: query.city, activeOnly: query.active_only !== "false" }),
);
