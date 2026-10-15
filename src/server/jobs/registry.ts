import "server-only";
import type { Database } from "@/server/db/types";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export interface JobDefinition<P = unknown> {
  kind: string;
  /** Validates and types the payload. Throwing here fails the job without retrying usefully, so keep it strict. */
  parse: (payload: unknown) => P;
  run: (payload: P, job: JobRow) => Promise<void>;
  /** Default 60 s. A job that runs longer is failed and retried. */
  timeoutMs?: number;
}

const handlers = new Map<string, JobDefinition<unknown>>();

export function defineJob<P>(def: JobDefinition<P>): JobDefinition<P> {
  if (!/^[a-z][a-z0-9_.]*$/.test(def.kind)) throw new Error(`Invalid job kind ${def.kind}`);
  handlers.set(def.kind, def as JobDefinition<unknown>);
  return def;
}

export const jobHandler = (kind: string) => handlers.get(kind);
export const registeredKinds = () => [...handlers.keys()];
