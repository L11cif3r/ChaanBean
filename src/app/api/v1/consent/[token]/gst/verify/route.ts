import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { verifyGstOtp } from "@/server/consent/service";

const body = z.object({ gstOtp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the GST portal.") });

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => verifyGstOtp(tokenOf(params), body.gstOtp, visitor(ctx)));
