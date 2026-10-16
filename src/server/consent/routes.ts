import "server-only";
import { AppError } from "@/server/errors";
import type { RequestContext } from "@/server/context";
import type { Visitor } from "./service";

// Shared by the public consent routes (S10): the link token from the path, and who is calling.
export function tokenOf(params: Record<string, string | string[]>) {
  const token = params.token;
  if (typeof token !== "string") throw new AppError("not_found", "This link is not valid.");
  return token;
}

export const visitor = (ctx: RequestContext): Visitor => ({ requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent });
