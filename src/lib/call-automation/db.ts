// Shared primitives for Call Automation persistence. Raw SQL on purpose: the scheduler needs
// SELECT ... FOR UPDATE SKIP LOCKED and the idempotency constraints are partial unique indexes, neither of
// which Prisma models can express. It also keeps this feature from editing the shared Prisma schema files.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type Db = Prisma.TransactionClient | typeof prisma;
export const tx = <T>(fn: (t: Prisma.TransactionClient) => Promise<T>) =>
  prisma.$transaction(fn, { timeout: 20_000, maxWait: 10_000 });

export type EventActor = "USER" | "SYSTEM" | "PROVIDER";

/** Appends a timeline event. Returns false when an identical (attempt, type) event already exists (replay). */
export async function addEvent(
  db: Db,
  e: {
    organisationId: string;
    caseId: string;
    attemptId?: string | null;
    type: string;
    actor: EventActor;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
    at?: Date;
  },
): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO collection_events (organisation_id, case_id, attempt_id, event_type, actor_type, actor_id, occurred_at, metadata)
    VALUES (${e.organisationId}::uuid, ${e.caseId}::uuid, ${e.attemptId ?? null}::uuid, ${e.type}, ${e.actor},
            ${e.actorId ?? null}::uuid, ${e.at ?? new Date()}::timestamptz, ${JSON.stringify(e.metadata ?? {})}::jsonb)
    ON CONFLICT (attempt_id, event_type) WHERE attempt_id IS NOT NULL DO NOTHING
    RETURNING id::text`;
  return rows.length > 0;
}

export const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
