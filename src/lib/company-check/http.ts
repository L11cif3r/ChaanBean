import crypto from "crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { toJsonSafe } from "./money";

// One error shape for every v1 endpoint (PRD §14): { error: { code, message, correlation_id } }.
export function errorResponse(e: unknown, correlationId: string = crypto.randomUUID()) {
  if (e instanceof AppError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, correlation_id: correlationId, ...(e.details ? { details: e.details } : {}) } },
      { status: e.status },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: e.issues[0]?.message ?? "Check the highlighted fields.",
          correlation_id: correlationId,
          details: { fields: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        },
      },
      { status: 422 },
    );
  }
  // Never leak internals to the client; the correlation id ties the log line to the response.
  console.error("[api/v1] unhandled", { correlationId, error: e instanceof Error ? e.message : String(e) });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Try again.", correlation_id: correlationId } },
    { status: 500 },
  );
}

export const ok = (body: unknown, status = 200) => NextResponse.json(toJsonSafe(body), { status });

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
}
