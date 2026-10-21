import "server-only";
import crypto from "node:crypto";
import { decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { MOCK, primary } from "@/server/providers/registry";
import { refuse } from "@/server/providers/slots";

// Object storage behind interfaces, so the backing store can change without touching callers (PRD 12.1: object
// storage for PDFs, uploads and WORM records).
//
// Development keeps objects in app_private.stored_objects, which only the server's database connection can reach.
// The database refuses to change a stored object, refuses to delete evidence outside retention clean-up, and every
// read re-checks the SHA-256 recorded at write time. Production swaps EvidenceStore for S3 with Object Lock or Google
// Cloud Storage with Bucket Lock (PROVIDER_STORAGE=s3|gcs, docs/PROVIDERS.md): write the adapter, add it to REAL_EVIDENCE.
// References keep the "evidence/<path>" form whichever store holds the bytes.

export interface EvidenceStore {
  /** Stores bytes once. Writing to an existing path fails. Returns a reference to keep in the database. */
  putOnce(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
  get(ref: string): Promise<Uint8Array>;
}

export interface RawResponseStore {
  /** Encrypts and stores a provider's raw response (PRD FR-CW-07). */
  put(path: string, value: unknown): Promise<string>;
  get(ref: string): Promise<unknown>;
}

type Bucket = "evidence" | "raw-responses";

const sha256 = (bytes: Uint8Array) => crypto.createHash("sha256").update(bytes).digest("hex");

function splitRef(ref: string, bucket: Bucket): string {
  const prefix = `${bucket}/`;
  if (!ref.startsWith(prefix)) throw new Error(`Reference ${ref} is not in ${bucket}`);
  return ref.slice(prefix.length);
}

async function putOnce(bucket: Bucket, path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const rows = await sql()`
    insert into app_private.stored_objects (bucket, path, content_type, bytes, sha256)
    values (${bucket}, ${path}, ${contentType}, ${Buffer.from(bytes)}, ${sha256(bytes)})
    on conflict (bucket, path) do nothing
    returning path`;
  if (!rows.length) throw new Error(`${bucket}/${path} already exists and cannot be replaced`);
  return `${bucket}/${path}`;
}

async function read(bucket: Bucket, path: string): Promise<Uint8Array> {
  const [row] = await sql()<{ bytes: Buffer; sha256: string }[]>`
    select bytes, sha256 from app_private.stored_objects where bucket = ${bucket} and path = ${path}`;
  if (!row) throw new Error(`${bucket}/${path} was not found`);
  const bytes = new Uint8Array(row.bytes);
  if (sha256(bytes) !== row.sha256) throw new Error(`${bucket}/${path} does not match its recorded hash`);
  return bytes;
}

const databaseEvidence: EvidenceStore = {
  putOnce: (path, bytes, contentType) => putOnce("evidence", path, bytes, contentType),
  get: (ref) => read("evidence", splitRef(ref, "evidence")),
};

/** Real write-once stores by provider name. Until one is added, choosing it refuses loudly (nothing is sealed). */
const REAL_EVIDENCE: Record<string, EvidenceStore> = {};

function evidenceBackend(): EvidenceStore {
  const name = primary("storage");
  if (name === MOCK) return databaseEvidence;
  return REAL_EVIDENCE[name] ?? { putOnce: async () => refuse(name, "write-once storage"), get: async () => refuse(name, "write-once storage") };
}

export const evidenceStore: EvidenceStore = {
  putOnce: (path, bytes, contentType) => evidenceBackend().putOnce(path, bytes, contentType),
  // Files sealed before a switch stay readable from the database copy.
  get: async (ref) => {
    const backend = evidenceBackend();
    if (backend === databaseEvidence) return databaseEvidence.get(ref);
    try {
      return await backend.get(ref);
    } catch (e) {
      const [row] = await sql()`select 1 from app_private.stored_objects where bucket = 'evidence' and path = ${splitRef(ref, "evidence")}`;
      if (row) return databaseEvidence.get(ref);
      throw e;
    }
  },
};

export const rawResponseStore: RawResponseStore = {
  async put(path, value) {
    const sealed = encryptField(JSON.stringify(value), `raw-responses/${path}`);
    return putOnce("raw-responses", path, new TextEncoder().encode(sealed), "text/plain");
  },
  async get(ref) {
    const path = splitRef(ref, "raw-responses");
    const text = new TextDecoder().decode(await read("raw-responses", path));
    return JSON.parse(decryptField(text, `raw-responses/${path}`));
  },
};
