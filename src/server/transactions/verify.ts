import "server-only";
import crypto from "node:crypto";
import { blindIndex } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";

// Public verify page (PRD v3.0 8.5 step 6; v1.0 S22, FR-TX-11). Anyone with the reference can check that a sealed
// agreement (CHB-TX) or E-Settlement (CHB-ST) exists, and, by giving the SHA-256 their browser worked out from the PDF,
// that the file is unchanged. Only the parties' names and the seal time are shown: no amounts or personal details.
// 30 checks per IP an hour.

export const REFERENCE_RE = /^CHB-(TX|ST)-\d{6}$/;
const PER_HOUR = 30;

export interface VerifyResult {
  found: boolean;
  reference: string;
  /** Present when a hash was given. */
  matches: boolean | null;
  sealedAt: string | null;
  version: number | null;
  parties: { from: string; to: string } | null;
}

export async function verifyDocument(reference: string, sha256: string | null, ip: string | null): Promise<VerifyResult> {
  const ref = reference.trim().toUpperCase();
  if (!REFERENCE_RE.test(ref)) throw new AppError("validation_failed", "Enter a valid reference.", { reference: "Enter a valid reference, like CHB-TX-000123." });
  if (sha256 !== null && !/^[0-9a-f]{64}$/.test(sha256)) throw new AppError("bad_request", "That is not a SHA-256 hash.");
  const db = sql();
  const ipHash = blindIndex(ip ?? "unknown", "verify-ip");
  const [{ n }] = await db<{ n: number }[]>`select count(*)::int as n from app_private.verify_hits where ip_hash = ${ipHash} and at > now() - interval '1 hour'`;
  if (n >= PER_HOUR) throw new AppError("rate_limited", "Too many checks from this connection. Please try again in an hour.");
  await db`insert into app_private.verify_hits (ip_hash) values (${ipHash})`;

  const seals = await db<{ sha256: string; sealed_at: Date; version: number; from_name: string; to_name: string }[]>`
    select s.sha256, s.sealed_at, s.version, coalesce(o.display_name, o.legal_name) as from_name, c.legal_name as to_name
      from public.transaction_seals s
      join public.transactions t on t.id = s.transaction_id
      join public.organisations o on o.id = t.org_id
      join public.counterparties c on c.id = t.counterparty_id
     where s.reference = ${ref}
    union all
    select s.sha256, s.sealed_at, s.version, coalesce(o.display_name, o.legal_name) as from_name, c.legal_name as to_name
      from public.settlement_seals s
      join public.settlements t on t.id = s.settlement_id
      join public.organisations o on o.id = t.org_id
      join public.counterparties c on c.id = t.counterparty_id
     where s.reference = ${ref}
     order by version desc`;
  if (!seals.length) return { found: false, reference: ref, matches: null, sealedAt: null, version: null, parties: null };
  // A file may be any sealed version of the agreement; compare in constant time.
  const hit = sha256 ? seals.find((s) => crypto.timingSafeEqual(Buffer.from(s.sha256), Buffer.from(sha256))) : undefined;
  const shown = hit ?? seals[0];
  return {
    found: true,
    reference: ref,
    matches: sha256 ? Boolean(hit) : null,
    sealedAt: shown.sealed_at.toISOString(),
    version: shown.version,
    parties: { from: shown.from_name, to: shown.to_name },
  };
}
