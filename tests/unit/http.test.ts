import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { RequestContext } from "@/server/context";

// The route wrapper is tested without a Next.js server: request-time APIs and the session lookup are stubbed.
let ctx: RequestContext;

vi.mock("next/server", () => ({ connection: async () => undefined, after: (fn: () => unknown) => fn() }));
vi.mock("@/server/context", async (orig) => {
  const real = await orig<typeof import("@/server/context")>();
  return { ...real, getContext: async () => ctx };
});

const { route } = await import("@/server/http");
const { AppError } = await import("@/server/errors");

const signedIn = (role: RequestContext["role"]): RequestContext => ({
  requestId: "CB-TEST000001",
  ip: "203.0.113.5",
  userAgent: "vitest",
  user: { id: "11111111-1111-1111-1111-111111111111", phone: "+919876543210", email: null },
  orgId: role ? "22222222-2222-2222-2222-222222222222" : null,
  role,
  memberships: role ? [{ orgId: "22222222-2222-2222-2222-222222222222", role }] : [],
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  ctx = signedIn("member");
});

describe("route()", () => {
  it("returns the handler result as JSON with the request id", async () => {
    const handler = route({ capability: "check.run" }, async () => ({ hello: "world" }));
    const res = await handler(post({}));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("CB-TEST000001");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("rejects signed-out callers with 401", async () => {
    ctx = { ...signedIn(null), user: null };
    const res = await route({ auth: "user" }, async () => ({}))(post({}));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthenticated");
  });

  it("enforces the permission matrix with 403 (Member cannot manage billing)", async () => {
    const res = await route({ capability: "billing.manage" }, async () => ({}))(post({}));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatchObject({ code: "forbidden", reference: "CB-TEST000001" });
  });

  it("returns field-level messages for invalid input", async () => {
    const body = z.object({ gstin: z.string().length(15, "This GSTIN is not valid. Check and try again.") });
    const res = await route({ capability: "check.run", body }, async () => ({}))(post({ gstin: "123" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.fields).toEqual({ gstin: "This GSTIN is not valid. Check and try again." });
  });

  it("rejects a body that is not JSON", async () => {
    const res = await route({ capability: "check.run", body: z.object({}) }, async () => ({}))(post("{not json"));
    expect(res.status).toBe(400);
  });

  it("passes AppError messages through", async () => {
    const res = await route({ auth: "user" }, async () => {
      throw new AppError("conflict", "This counterparty already exists");
    })(post({}));
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe("This counterparty already exists");
  });

  it("hides unexpected errors behind a support reference", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await route({ auth: "user" }, async () => {
      throw new Error("db password is hunter2 for 9876543210");
    })(post({}));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error.reference).toBe("CB-TEST000001");
    expect(JSON.stringify(json)).not.toContain("hunter2");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("9876543210");
    spy.mockRestore();
  });

  it("accepts cron calls only with the right secret", async () => {
    process.env.CRON_SECRET = "a".repeat(48);
    const handler = route({ auth: "cron" }, async () => ({ ran: true }));
    expect((await handler(post({}, { authorization: `Bearer ${"a".repeat(48)}` }))).status).toBe(200);
    expect((await handler(post({}, { authorization: "Bearer wrong" }))).status).toBe(401);
    expect((await handler(post({}))).status).toBe(401);
  });
});
