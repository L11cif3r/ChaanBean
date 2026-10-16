import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { requestGstOtp } from "@/server/consent/service";

// S10 marker 4 (v3 FR-CON-04): the buyer's GST portal username; GSTN then sends its own OTP.
const body = z.object({ gstUsername: z.string().trim().min(1, "Enter your GST portal username.").max(60) });

export const POST = route({ auth: "public", body }, async ({ body, params }) => requestGstOtp(tokenOf(params), body.gstUsername));
