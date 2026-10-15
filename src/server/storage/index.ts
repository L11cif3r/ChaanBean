import "server-only";
import { decryptField, encryptField } from "@/server/crypto";
import { adminClient } from "@/server/supabase/admin";

// Object storage behind interfaces, so the backing store can change without touching callers (PRD 12.1: object
// storage for PDFs, uploads and WORM records).
//
// Development uses private Supabase Storage buckets that only the server can reach. Production swaps EvidenceStore
// for S3 with Object Lock (write-once, PRD FR-TX-06) once the Chaanbean AWS account exists. Supabase Storage cannot
// lock objects, so the dev store only refuses overwrites; it is not real WORM storage.

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

const EVIDENCE_BUCKET = "evidence";
const RAW_BUCKET = "raw-responses";

async function download(bucket: string, path: string): Promise<Uint8Array> {
  const { data, error } = await adminClient().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Could not read ${bucket}/${path}: ${error?.message ?? "empty"}`);
  return new Uint8Array(await data.arrayBuffer());
}

function splitRef(ref: string, bucket: string): string {
  const prefix = `${bucket}/`;
  if (!ref.startsWith(prefix)) throw new Error(`Reference ${ref} is not in ${bucket}`);
  return ref.slice(prefix.length);
}

export const supabaseEvidenceStore: EvidenceStore = {
  async putOnce(path, bytes, contentType) {
    const { error } = await adminClient()
      .storage.from(EVIDENCE_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(`Could not store evidence ${path}: ${error.message}`);
    return `${EVIDENCE_BUCKET}/${path}`;
  },
  get: (ref) => download(EVIDENCE_BUCKET, splitRef(ref, EVIDENCE_BUCKET)),
};

export const supabaseRawResponseStore: RawResponseStore = {
  async put(path, value) {
    const sealed = encryptField(JSON.stringify(value), `${RAW_BUCKET}/${path}`);
    const { error } = await adminClient()
      .storage.from(RAW_BUCKET)
      .upload(path, new TextEncoder().encode(sealed), { contentType: "text/plain", upsert: false });
    if (error) throw new Error(`Could not store raw response ${path}: ${error.message}`);
    return `${RAW_BUCKET}/${path}`;
  },
  async get(ref) {
    const path = splitRef(ref, RAW_BUCKET);
    const text = new TextDecoder().decode(await download(RAW_BUCKET, path));
    return JSON.parse(decryptField(text, `${RAW_BUCKET}/${path}`));
  },
};

export const evidenceStore: EvidenceStore = supabaseEvidenceStore;
export const rawResponseStore: RawResponseStore = supabaseRawResponseStore;
