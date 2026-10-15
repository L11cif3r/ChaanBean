import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/server/env";
import { sql } from "@/server/db/sql";

// Development-only sign-in shortcut for the test numbers, used while Supabase phone sign-in is not enabled.
// It is never active in a production build. Each test number gets a real Supabase user (with that phone number) that
// is signed in through Supabase's email-and-password method with a server-derived password, so the session, cookies
// and every other rule are the same as a real OTP sign-in. No message is sent.

export const DEV_TEST_MOBILES = ["9000000001", "9000000002", "9000000003"] as const;
export const DEV_TEST_CODE = "123456";

export function devShortcutFor(mobile10: string): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_PHONE_SHORTCUT !== "false" && (DEV_TEST_MOBILES as readonly string[]).includes(mobile10);
}

export const devEmail = (mobile10: string) => `dev-${mobile10}@chaanbean.test`;

/** Password derived from a server secret, so it is never stored or shown anywhere. */
export function devPassword(mobile10: string): string {
  return crypto.createHmac("sha256", serverEnv().SESSION_COOKIE_SECRET).update(`dev-signin:${mobile10}`).digest("base64url");
}

/** Creates the Supabase user for a test number if needed and (re)sets its password and email identity. */
export async function ensureDevUser(mobile10: string): Promise<void> {
  const db = sql();
  const phone = `91${mobile10}`;
  const email = devEmail(mobile10);
  const password = devPassword(mobile10);
  const [existing] = await db<{ id: string }[]>`select id from auth.users where phone = ${phone} or email = ${email} limit 1`;
  let id = existing?.id;
  if (!id) {
    id = crypto.randomUUID();
    await db`
      insert into auth.users (instance_id, id, aud, role, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
      values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated', ${email}, ${phone},
        extensions.crypt(${password}, extensions.gen_salt('bf')), now(), now(), now(), now(),
        ${db.json({ provider: "phone", providers: ["phone", "email"] })}, ${db.json({})}, '', '', '', '', '', '', '', '')`;
  } else {
    await db`
      update auth.users
         set email = coalesce(email, ${email}), phone = coalesce(phone, ${phone}), phone_confirmed_at = coalesce(phone_confirmed_at, now()),
             email_confirmed_at = coalesce(email_confirmed_at, now()), encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf'))
       where id = ${id}`;
  }
  const [user] = await db<{ email: string }[]>`select email from auth.users where id = ${id}`;
  await db`
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), ${id}, ${id}, ${db.json({ sub: id, email: user.email, email_verified: true })}, 'email', now(), now(), now())
    on conflict (provider_id, provider) do nothing`;
}
