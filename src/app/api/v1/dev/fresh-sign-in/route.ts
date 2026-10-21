import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/server/auth/session";
import { userClient } from "@/server/supabase/server";

// Development only: a session whose user no longer exists (the test data was reset) is signed out and sent to
// sign-in, so a test number can simply sign in again instead of landing on business sign-up.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const supabase = await userClient();
  await supabase.auth.signOut({ scope: "local" });
  await clearSessionCookies();
  return NextResponse.redirect(new URL("/login", request.url));
}
