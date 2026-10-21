import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { sendAgreementOtp } from "@/server/transactions/public";

// v3 15.3: OTP to the counterparty's mobile on record (WhatsApp through Exotel once connected; mock until then).
export const POST = route({ auth: "public" }, async ({ params }) => sendAgreementOtp(tokenOf(params)));
