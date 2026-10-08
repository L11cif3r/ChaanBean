export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, `${what.toUpperCase()}_NOT_FOUND`, `${what} not found.`);
export const forbidden = (code: string, message: string) => new AppError(403, code, message);
export const badRequest = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(422, code, message, details);

export interface RequestContext {
  userId: string;
  organisationId: string;
  role: "OWNER" | "FINANCE" | "READ_ONLY";
  correlationId: string;
  ip?: string;
  userAgent?: string;
}
