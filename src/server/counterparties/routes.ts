import "server-only";
import { z } from "zod";
import type { RequestContext } from "@/server/context";

// Shared pieces for the /api/v1/counterparties routes.

/** The context after route({ capability }) has checked the user and organisation. */
export const orgCtx = (ctx: RequestContext) => ({ ...ctx, user: ctx.user!, orgId: ctx.orgId! });

export const listQuery = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(["active", "archived", "all"]).optional(),
  tag: z.string().max(30).optional(),
  sort: z.enum(["name", "created"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  size: z.coerce.number().int().optional(),
});
