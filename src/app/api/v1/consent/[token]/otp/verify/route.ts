import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { verifyConsentOtp } from "@/server/consent/service";

const body = z.object({ otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") });

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => verifyConsentOtp(tokenOf(params), body.otp, visitor(ctx)));
