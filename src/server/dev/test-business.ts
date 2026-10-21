import "server-only";
import { gstinChecksumChar } from "@/lib/validators";
import { blindIndex, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { DEV_TEST_MOBILES, devShortcutFor } from "@/server/auth/dev-signin";
import { LEGAL_VERSIONS } from "@/server/onboarding/service";

// Development only: the hand-testing numbers (90000 00001 to 00003) never go through business sign-up or KYC. When
// one signs in without a business, it gets a ready test business at once: GSTIN verified, KYC verified (test data),
// the person as Owner. Never active in production (devShortcutFor checks NODE_ENV), and never for other numbers.

const HAND_TESTING = DEV_TEST_MOBILES.slice(0, 3) as readonly string[];

/** "919000000001" or "+91 90000 00001" → "9000000001". */
const mobile10 = (phone: string | null) => (phone ?? "").replace(/\D/g, "").slice(-10);

export function isHandTestingNumber(phone: string | null): boolean {
  const m = mobile10(phone);
  return HAND_TESTING.includes(m) && devShortcutFor(m);
}

/**
 * Makes sure a hand-testing number has a business. Returns "ready" when it has (or now has) one, "stale" when the
 * session belongs to a user that no longer exists (sign in again), and "no" for every other user.
 */
export async function ensureTestBusiness(user: { id: string; phone: string | null }): Promise<"ready" | "stale" | "no"> {
  if (!isHandTestingNumber(user.phone)) return "no";
  const db = sql();
  const [exists] = await db<{ id: string }[]>`select id from auth.users where id = ${user.id}`;
  if (!exists) return "stale";
  const [member] = await db<{ org_id: string }[]>`
    select org_id from public.memberships where user_id = ${user.id} and status = 'active' limit 1`;
  if (member) return "ready";

  const m = mobile10(user.phone);
  const n = m.slice(-1); // 1, 2 or 3
  // A fixed, valid-looking GSTIN per number, outside the ranges the e2e suite and the mock GST provider use.
  const pan = `AAACZ900${n}T`;
  const base = `29${pan}1Z`;
  const gstin = base + gstinChecksumChar(base);
  const legalName = `CHAANBEAN TEST BUSINESS ${n}`;
  // Pages render in parallel; a per-user lock and a second look inside it make sure only one business is made.
  await db.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${`test-business:${user.id}`}))`;
    const [again] = await tx<{ org_id: string }[]>`
      select org_id from public.memberships where user_id = ${user.id} and status = 'active' limit 1`;
    if (again) return;
    const [kept] = await tx<{ id: string }[]>`select id from public.organisations where gstin = ${gstin}`;
    let orgId = kept?.id;
    if (orgId) {
      // The test business survived a reset of its user: give it back to this number as Owner.
      await tx`
        insert into public.user_profiles (id, full_name, email, designation)
        values (${user.id}, ${`Test Owner ${n}`}, ${`dev-${m}@chaanbean.test`}, ${"Owner"}) on conflict (id) do nothing`;
      await tx`
        insert into public.memberships (org_id, user_id, role, status, joined_at)
        values (${orgId}, ${user.id}, 'owner', 'active', now())
        on conflict (org_id, user_id) do update set role = 'owner', status = 'active'`;
    } else {
      const [row] = await tx<{ id: string }[]>`
        select app_private.create_organisation(
          ${user.id}::uuid, ${legalName}, ${`Test Business ${n}`}, ${gstin}, ${blindIndex(pan, "pan")},
          ${encryptField(pan, "organisations.pan")}, ${"Private Limited Company"}, ${"29"},
          ${tx.json({ line: "1 Test Street, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" })}::jsonb, ${"gstin"},
          ${"gstin_verified"}::public.org_verification, ${"active"}::public.org_status,
          ${`Test Owner ${n}`}, ${"Owner"}, ${`dev-${m}@chaanbean.test`},
          ${LEGAL_VERSIONS.terms}, ${LEGAL_VERSIONS.privacy}, ${LEGAL_VERSIONS.authority},
          ${null}::inet, ${"dev test business"}, ${"dev-test-business"}
        ) as id`;
      orgId = row.id;
    }
    await tx`
      update public.organisations
         set kyc_status = 'verified', kyc_method = 'digilocker_aadhaar', kyc_name = ${`Test Owner ${n}`},
             kyc_doc_masked = 'XXXX XXXX 7058', kyc_verified_at = now(), kyc_user_id = ${user.id}
       where id = ${orgId}`;
    await tx`insert into public.wallets (org_id) values (${orgId}) on conflict (org_id) do nothing`;
  });
  return "ready";
}
