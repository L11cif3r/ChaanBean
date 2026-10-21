import "server-only";
import type { RequestContext } from "@/server/context";
import type { Visitor } from "./public";

/** A PDF or file as a download, never cached. */
export function fileResponse(bytes: Uint8Array, name: string, type: string, inline = true) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": type,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export const visitor = (ctx: RequestContext): Visitor => ({ requestId: ctx.requestId, ip: ctx.ip, userAgent: ctx.userAgent });
