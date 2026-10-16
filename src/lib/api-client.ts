"use client";

// Browser-side calls to /api/v1. Errors come back in the route() format: { code, message, fields?, reference }.

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  reference?: string;
  status: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; /** v3 section 15: sent on POSTs that charge. */ idempotencyKey?: string } = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
      headers: {
        ...(opts.form ? {} : { "content-type": "application/json" }),
        ...(opts.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}),
      },
      body: opts.form ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    const e = json?.error ?? {};
    return {
      ok: false,
      error: {
        code: e.code ?? "internal",
        message: e.message ?? "Something went wrong. Please try again.",
        fields: e.fields,
        reference: e.reference ?? res.headers.get("x-request-id") ?? undefined,
        status: res.status,
      },
    };
  } catch {
    return { ok: false, error: { code: "network", message: "Could not reach Chaanbean. Check your connection and try again.", status: 0 } };
  }
}
