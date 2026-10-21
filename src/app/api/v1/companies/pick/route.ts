import { z } from "zod";
import { pickCompany } from "@/server/companies/search";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v4 FR-SR-06: picking a search result creates or links the buyer. Free (FR-SR-08).
const body = z.discriminatedUnion("source", [
  z.object({ source: z.literal("mca"), cin: z.string().min(8).max(21) }),
  z.object({ source: z.literal("gst"), gstin: z.string().length(15) }),
]);

export const POST = route({ capability: "counterparty.manage", body }, async ({ ctx, body }) => pickCompany(orgCtx(ctx), body));
