// Errors that are safe to show the user. Anything else becomes a 500 with a support reference (PRD 7 common rules:
// "Server errors show a reference ID for support").

export type ErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** Field-level messages, keyed by field name, shown next to each input. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const unauthenticated = () => new AppError("unauthenticated", "Please sign in to continue.");
export const forbidden = () => new AppError("forbidden", "You do not have permission to do this.");
export const notFound = (what = "This item") => new AppError("not_found", `${what} was not found.`);
