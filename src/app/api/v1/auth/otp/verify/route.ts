import { z } from "zod";
import { formatDateTimeIst } from "@/lib/dates";
import { maskMobile } from "@/lib/mask";
import { safeNext } from "@/lib/session-cookie";
import { normaliseMobile, toE164 } from "@/lib/validators";
import { audit } from "@/server/audit";
import { DEV_TEST_CODE, devEmail, devPassword, devShortcutFor, ensureDevUser } from "@/server/auth/dev-signin";
import { currentOtpState, recordOtpEvent } from "@/server/auth/otp";
import { issueSessionCookie, setActiveOrg } from "@/server/auth/session";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { userClient } from "@/server/supabase/server";

// S01: check the OTP, start the session and say where to go next (FR-AUTH-01, 02, 04, 06).
const body = z.object({
  mobile: z.string().refine((v) => normaliseMobile(v) !== null, "Enter a valid 10-digit Indian mobile number."),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP."),
  trusted: z.boolean().default(false),
  next: z.string().max(300).optional(),
});

export const POST = route({ auth: "public", body }, async ({ body, ctx }) => {
  const mobile = normaliseMobile(body.mobile)!;
  const masked = maskMobile(mobile);
  const before = await currentOtpState(mobile);
  if (before.lockedUntil) {
    throw new AppError("rate_limited", `Too many attempts. Try again after ${formatDateTimeIst(before.lockedUntil)}.`);
  }

  const supabase = await userClient();
  let data: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>["data"];
  let error: unknown;
  if (devShortcutFor(mobile)) {
    // Development test numbers (see src/server/auth/dev-signin.ts): fixed code, real Supabase session.
    if (body.code === DEV_TEST_CODE) {
      await ensureDevUser(mobile);
      ({ data, error } = await supabase.auth.signInWithPassword({ email: devEmail(mobile), password: devPassword(mobile) }));
    } else {
      data = { user: null, session: null };
      error = new Error("wrong code");
    }
  } else {
    ({ data, error } = await supabase.auth.verifyOtp({ phone: toE164(mobile), token: body.code, type: "sms" }));
  }
  if (error || !data.session || !data.user) {
    await recordOtpEvent(mobile, "fail", ctx.ip);
    await audit({ ...ctx, orgId: null }, { orgId: null, action: "auth.sign_in_failed", entity: "phone", after: { mobile: masked } });
    const after = await currentOtpState(mobile);
    if (after.lockedUntil) {
      throw new AppError("rate_limited", `Too many attempts. Try again after ${formatDateTimeIst(after.lockedUntil)}.`);
    }
    const left = after.attemptsLeft;
    throw new AppError("validation_failed", "The OTP is incorrect.", {
      code: `The OTP is incorrect. You have ${left} ${left === 1 ? "attempt" : "attempts"} left.`,
    });
  }

  await recordOtpEvent(mobile, "success", ctx.ip);
  const userId = data.user.id;

  const memberships = await sql()<{ org_id: string; role: string; status: string; legal_name: string }[]>`
    select m.org_id, m.role::text, m.status::text, o.legal_name
      from public.memberships m join public.organisations o on o.id = m.org_id
     where m.user_id = ${userId}
     order by m.created_at`;
  const active = memberships.filter((m) => m.status === "active");
  const first = active[0];

  await issueSessionCookie(data.session.access_token, {
    trusted: body.trusted,
    strict: first ? first.role === "owner" || first.role === "admin" : false,
  });
  if (first) await setActiveOrg(first.org_id);

  await audit({ ...ctx, user: { id: userId }, orgId: null }, {
    orgId: null,
    action: "auth.signed_in",
    entity: "user",
    entityId: userId,
    after: { mobile: masked, trusted: body.trusted, organisations: active.length },
  });

  if (active.length) return { next: safeNext(body.next) ?? "/dashboard" };
  const removed = memberships.find((m) => m.status === "deactivated");
  if (removed) return { next: null, removedFrom: removed.legal_name };
  return { next: safeNext(body.next)?.startsWith("/invite/") ? body.next : "/signup/business" };
});
