import { handleSmsHook } from "@/server/auth/sms-hook";
import { route } from "@/server/http";

// Supabase Auth Send SMS hook: sign-in OTP by SMS through Fast2SMS (v4 11.1). Off until switched on (see the server file).
export const POST = route({ auth: "public" }, async ({ req }) => handleSmsHook(await req.text(), req.headers));
