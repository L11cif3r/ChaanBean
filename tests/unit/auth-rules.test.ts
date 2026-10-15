import { describe, expect, it } from "vitest";
import { otpState, OTP_RULES, type OtpEvent } from "@/server/auth/otp-limits";
import { evaluateSession, LIMITS, readSession, safeNext, signSession, type SessionCookie } from "@/lib/session-cookie";

const at = (minutesAgo: number, now: Date) => new Date(now.getTime() - minutesAgo * 60_000);
const now = new Date("2026-10-15T10:00:00Z");
const ev = (kind: OtpEvent["kind"], minutesAgo: number): OtpEvent => ({ kind, at: at(minutesAgo, now) });

describe("OTP limits (PRD S01, FR-AUTH-02)", () => {
  it("allows up to 5 sends per hour, then names the time the next one is allowed", () => {
    const four = [50, 40, 30, 20].map((m) => ev("send", m));
    expect(otpState(four, now).nextSendAt).toBeNull();
    const five = [...four, ev("send", 10)];
    // The oldest of the last five (50 minutes ago) leaves the window in 10 minutes.
    expect(otpState(five, now).nextSendAt?.toISOString()).toBe(new Date(now.getTime() + 10 * 60_000).toISOString());
  });

  it("forgets sends older than an hour", () => {
    expect(otpState([65, 64, 63, 62, 61].map((m) => ev("send", m)), now).nextSendAt).toBeNull();
  });

  it("counts down wrong codes and locks for 30 minutes after the fifth", () => {
    expect(otpState([ev("fail", 3), ev("fail", 2)], now).attemptsLeft).toBe(3);
    const five = [5, 4, 3, 2, 1].map((m) => ev("fail", m));
    const s = otpState(five, now);
    expect(s.attemptsLeft).toBe(0);
    expect(s.lockedUntil?.toISOString()).toBe(new Date(now.getTime() + 29 * 60_000).toISOString());
  });

  it("unlocks 30 minutes after the fifth wrong code", () => {
    const old = [40, 39, 38, 37, 36].map((m) => ev("fail", m));
    expect(otpState(old, now).lockedUntil).toBeNull();
  });

  it("starts counting again after a successful sign-in", () => {
    const events = [ev("fail", 10), ev("fail", 9), ev("fail", 8), ev("fail", 7), ev("success", 6), ev("fail", 2)];
    expect(otpState(events, now)).toMatchObject({ lockedUntil: null, attemptsLeft: OTP_RULES.failuresBeforeLock - 1 });
  });
});

describe("session cookie (FR-AUTH-04)", () => {
  const secret = "s".repeat(44);
  const base: SessionCookie = { sid: "sess-1", uid: "user-1", st: now.getTime(), tr: false, ls: now.getTime(), sx: false };

  it("round-trips and rejects any change", () => {
    const token = signSession(base, secret);
    expect(readSession(token, secret)).toEqual(base);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, tr: true })).toString("base64url");
    expect(readSession(`${forged}.${sig}`, secret)).toBeNull();
    expect(readSession(`${body}.${sig}x`, secret)).toBeNull();
    expect(readSession(token, "t".repeat(44))).toBeNull();
    expect(readSession(undefined, secret)).toBeNull();
  });

  it("ends an untrusted session after 12 hours and a trusted one after 30 days", () => {
    const t = now.getTime();
    expect(evaluateSession(base, t + LIMITS.untrustedMs - 1000)).toBe("ok");
    expect(evaluateSession(base, t + LIMITS.untrustedMs + 1000)).toBe("expired");
    const trusted = { ...base, tr: true };
    expect(evaluateSession({ ...trusted, ls: t + 29 * 86_400_000 }, t + 29 * 86_400_000)).toBe("ok");
    expect(evaluateSession(trusted, t + LIMITS.trustedMs + 1000)).toBe("expired");
  });

  it("applies the 60-minute idle rule to Owners and Admins only", () => {
    const later = now.getTime() + 61 * 60_000;
    expect(evaluateSession({ ...base, sx: true }, later)).toBe("idle");
    expect(evaluateSession({ ...base, sx: false }, later)).toBe("ok");
  });

  it("only follows same-site paths after sign-in", () => {
    expect(safeNext("/counterparties?x=1")).toBe("/counterparties?x=1");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("/api/v1/me")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
