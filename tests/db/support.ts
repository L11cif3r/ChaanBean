import crypto from "node:crypto";
import postgres from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/types";

// Shared helpers for database tests. They use DIRECT_URL (session connection, several real connections at once) for
// setup and clean-up, and real Supabase sign-ins with the publishable key for anything a user does.

export const hasDatabase = Boolean(process.env.DIRECT_URL);
if (!hasDatabase) console.warn("DIRECT_URL is not set (.env): database tests skipped");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function connect(max = 10) {
  const raw = new URL(process.env.DIRECT_URL!);
  for (const p of ["pgbouncer", "connection_limit"]) raw.searchParams.delete(p);
  return postgres(raw.toString(), { max, ssl: "require", onnotice: () => undefined, idle_timeout: 5 });
}

export type Db = ReturnType<typeof connect>;

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
}

export const anonClient = () => createClient<Database>(url, publishable, { auth: { persistSession: false } });

/** A confirmed email user created directly in auth.users, then signed in through Supabase Auth for a real session. */
export async function makeUser(db: Db, label: string, tag: string): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `zz-test-${label}-${tag}@chaanbean.test`;
  const password = crypto.randomBytes(18).toString("base64url");
  await db`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated', ${email},
      extensions.crypt(${password}, extensions.gen_salt('bf')), now(), now(), now(),
      ${db.json({ provider: "email", providers: ["email"] })}, ${db.json({})}, '', '', '', '', '', '', '', '')`;
  await db`
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), ${id}, ${id}, ${db.json({ sub: id, email, email_verified: true })}, 'email', now(), now(), now())`;
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in for test user failed: ${error.message}`);
  return { id, email, client };
}

export async function makeOrg(db: Db, name: string, userId: string, role: Database["public"]["Enums"]["member_role"]) {
  const [org] = await db<{ id: string }[]>`
    insert into public.organisations (legal_name, created_by) values (${name}, ${userId}) returning id`;
  await db`
    insert into public.memberships (org_id, user_id, role, status, joined_at)
    values (${org.id}, ${userId}, ${role}::public.member_role, 'active', now())`;
  return org.id;
}

export async function removeUsers(db: Db, ids: string[]) {
  if (ids.length) await db`delete from auth.users where id in ${db(ids)}`;
}
