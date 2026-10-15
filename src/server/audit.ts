import "server-only";
import { redact } from "@/lib/mask";
import type { Json } from "@/server/db/types";
import { adminClient } from "@/server/supabase/admin";
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
  const actorType = actor.actorType ?? (actor.user ? "user" : "system");
  const { error } = await adminClient()
    .from("audit_log")
    .insert({
      org_id: entry.orgId === undefined ? actor.orgId : entry.orgId,
      actor_type: actorType,
      actor_id: actor.actorId ?? actor.user?.id ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      before: entry.before === undefined ? null : (redact(entry.before) as Json),
      after: entry.after === undefined ? null : (redact(entry.after) as Json),
      ip: actor.ip,
      user_agent: actor.userAgent,
      request_id: actor.requestId,
    });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

/** Actor for background jobs and scheduled work. */
export function systemActor(requestId: string, orgId: string | null = null): Actor {
  return { requestId, ip: null, userAgent: null, orgId, user: null, actorType: "system", actorId: "system" };
}
