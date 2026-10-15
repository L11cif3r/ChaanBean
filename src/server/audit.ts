import "server-only";
import type { JSONValue } from "postgres";
import { redact } from "@/lib/mask";
import { sql } from "@/server/db/sql";
import type { RequestContext } from "@/server/context";

// Audit log writer (FR-AUD-01). Rows are append-only and hash-chained per organisation by the database trigger, so
// nothing here can backdate, reorder or edit an entry. Values are masked before they are stored.
//
// For state changes made inside a Postgres function (ledger, transactions), write the audit row in that same
// function so the change and its audit entry commit together.

export interface AuditEntry {
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  /** Defaults to the context's active organisation. Pass null for platform-level events. */
  orgId?: string | null;
}

type Actor = Pick<RequestContext, "requestId" | "ip" | "userAgent" | "orgId"> & {
  user: { id: string } | null;
  actorType?: "user" | "system" | "counterparty" | "ops";
  actorId?: string;
};

export async function audit(actor: Actor, entry: AuditEntry): Promise<void> {
  const db = sql();
  const json = (v: unknown) => (v === undefined || v === null ? null : db.json(redact(v) as JSONValue));
  await db`
    insert into public.audit_log
      (org_id, actor_type, actor_id, action, entity, entity_id, before, after, ip, user_agent, request_id)
    values (
      ${entry.orgId === undefined ? actor.orgId : entry.orgId}::uuid,
      ${actor.actorType ?? (actor.user ? "user" : "system")}::public.audit_actor,
      ${actor.actorId ?? actor.user?.id ?? null},
      ${entry.action},
      ${entry.entity ?? null},
      ${entry.entityId ?? null},
      ${json(entry.before)}::jsonb,
      ${json(entry.after)}::jsonb,
      ${actor.ip}::inet,
      ${actor.userAgent},
      ${actor.requestId}
    )`;
}

/** Actor for background jobs and scheduled work. */
export function systemActor(requestId: string, orgId: string | null = null): Actor {
  return { requestId, ip: null, userAgent: null, orgId, user: null, actorType: "system", actorId: "system" };
}
