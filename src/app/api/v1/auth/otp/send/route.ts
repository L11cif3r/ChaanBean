import { z } from "zod";
import { normaliseMobile, toE164 } from "@/lib/validators";
import { formatDateTimeIst } from "@/lib/dates";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { devShortcutFor } from "@/server/auth/dev-signin";
import { currentOtpState, recordOtpEvent } from "@/server/auth/otp";
import { userClient } from "@/server/supabase/server";

// S01: send a 6-digit OTP to an Indian mobile (FR-AUTH-01/02). Limits are checked here, before Supabase is called.
const body = z.object({
  mobile: z.string().refine((v) => normaliseMobile(v) !== null, "Enter a valid 10-digit Indian mobile number."),
});

export const POST = route({ auth: "public", body }, async ({ body, ctx }) => {
  const mobile = normaliseMobile(body.mobile)!;
  const state = await currentOtpState(mobile);
  if (state.lockedUntil) {
    throw new AppError("rate_limited", `Too many attempts. Try again after ${formatDateTimeIst(state.lockedUntil)}.`);
  }
  if (state.nextSendAt) {
    throw new AppError("rate_limited", `You have asked for too many OTPs. Try again after ${formatDateTimeIst(state.nextSendAt)}.`);
  }

  // Development test numbers: no OTP is sent; the fixed code is checked in the verify route.
  if (devShortcutFor(mobile)) {
    await recordOtpEvent(mobile, "send", ctx.ip);
    return { sent: true, resendAfterSeconds: 30 };
  }

  const supabase = await userClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: toE164(mobile), options: { shouldCreateUser: true, channel: "sms" } });
  if (error) {
    if (error.status === 429) throw new AppError("rate_limited", "Too many OTP requests right now. Please wait a minute and try again.");
    console.error(`[auth] OTP send failed (${ctx.requestId}): ${error.status} ${error.code ?? ""}`);
    throw new AppError("unavailable", "We could not send the OTP right now. Please try again in a moment.");
  }
  await recordOtpEvent(mobile, "send", ctx.ip);
  return { sent: true, resendAfterSeconds: 30 };
});
