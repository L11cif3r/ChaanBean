import { z } from "zod";
import { reviewMatch } from "@/server/cases/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 FR-CC-04: the user marks a possible match Confirmed, Not this person or Unsure. Only Confirmed affects risk.
const body = z.object({ review: z.enum(["confirmed", "not_this_person", "unsure"], "Choose an answer.") });

export const PATCH = route({ capability: "case.run", body }, async ({ ctx, params, body }) => reviewMatch(orgCtx(ctx), String(params.id), body.review));
