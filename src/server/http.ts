import "server-only";
import crypto from "node:crypto";
import { connection } from "next/server";
import { z } from "zod";
import type { Capability } from "@/lib/permissions";
import { redact } from "@/lib/mask";
import { AppError } from "@/server/errors";
import { getContext, newRequestId, requireCapability, requireUser, type RequestContext } from "@/server/context";

// One wrapper for every API route: who may call it, input validation, and the error format the UI expects:
// { error: { code, message, fields?, reference } }. Unexpected errors are logged (with PII masked) and the user sees
// only the reference.

type Auth = "public" | "user" | "cron";
type Infer<S> = S extends z.ZodType ? z.infer<S> : undefined;

interface RouteOptions<B extends z.ZodType | undefined, Q extends z.ZodType | undefined> {
  /** Default "user". "cron" requires `Authorization: Bearer $CRON_SECRET`. */
  auth?: Auth;
  /** Capability the caller needs in their active organisation (PRD 4.3). Implies auth "user". */
  capability?: Capability;
  body?: B;
  query?: Q;
}

interface HandlerArgs<B, Q> {
  req: Request;
  ctx: RequestContext;
  body: B;
  query: Q;
  params: Record<string, string | string[]>;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

function errorBody(err: AppError, reference: string) {
  return { error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}), reference } };
}

function zodFields(err: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function route<B extends z.ZodType | undefined = undefined, Q extends z.ZodType | undefined = undefined>(
  opts: RouteOptions<B, Q>,
  handler: (args: HandlerArgs<Infer<B>, Infer<Q>>) => Promise<unknown>,
) {
  const auth: Auth = opts.capability ? "user" : (opts.auth ?? "user");

  return async (req: Request, routeCtx?: { params?: Promise<Record<string, string | string[]>> }) => {
    // API responses are always computed per request; with Cache Components a GET could otherwise be prerendered.
    await connection();
    let reference = req.headers.get("x-request-id") ?? newRequestId();
    try {
      let ctx: RequestContext;
      if (auth === "cron") {
        if (!cronAuthorised(req)) throw new AppError("unauthenticated", "Not authorised.");
        ctx = { requestId: reference, ip: null, userAgent: null, user: null, orgId: null, role: null, memberships: [] };
      } else {
        ctx = await getContext();
        reference = ctx.requestId;
        if (opts.capability) requireCapability(ctx, opts.capability);
        else if (auth === "user") requireUser(ctx);
      }

      let body = undefined as Infer<B>;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new AppError("bad_request", "The request body is not valid JSON.");
        }
        body = opts.body.parse(raw) as Infer<B>;
      }

      let query = undefined as Infer<Q>;
      if (opts.query) {
        query = opts.query.parse(Object.fromEntries(new URL(req.url).searchParams)) as Infer<Q>;
      }

      const params = (await routeCtx?.params) ?? {};
      const result = await handler({ req, ctx, body, query, params });
      const res = result instanceof Response ? result : json(result ?? { ok: true });
      res.headers.set("x-request-id", reference);
      return res;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const appErr = new AppError("validation_failed", "Please check the highlighted fields.", zodFields(err));
        return json(errorBody(appErr, reference), { status: appErr.status, headers: { "x-request-id": reference } });
      }
      if (err instanceof AppError) {
        return json(errorBody(err, reference), { status: err.status, headers: { "x-request-id": reference } });
      }
      console.error(
        `[api] ${req.method} ${new URL(req.url).pathname} failed (${reference})`,
        redact(err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { error: String(err) }),
      );
      const internal = new AppError("internal", "Something went wrong on our side. Please try again.");
      return json(errorBody(internal, reference), { status: 500, headers: { "x-request-id": reference } });
    }
  };
}
