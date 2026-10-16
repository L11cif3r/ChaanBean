import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { sendConsentOtp } from "@/server/consent/service";

// S10 marker 3: OTP to the mobile the requester entered (before approving, or before withdrawing).
export const POST = route({ auth: "public" }, async ({ params }) => sendConsentOtp(tokenOf(params)));
