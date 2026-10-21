import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { sendSettlementOtp } from "@/server/settlements/public";

// OTP to the debtor's mobile on record (through the OTP provider once connected; dummy until then).
export const POST = route({ auth: "public" }, async ({ params }) => sendSettlementOtp(tokenOf(params)));
