// PRD 4.3 permission matrix. The database table app_private.role_capabilities is the source of truth used by
// row-level security; this copy drives the server guard and hides actions in the UI. tests/db checks they match.

export const ROLES = ["owner", "admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const CAPABILITIES = {
  "dashboard.view": ["owner", "admin", "member", "viewer"],
  "counterparty.manage": ["owner", "admin", "member"],
  "check.run": ["owner", "admin", "member"],
  "report.view": ["owner", "admin", "member", "viewer"],
  "report.export": ["owner", "admin", "member", "viewer"],
  "case.run": ["owner", "admin", "member"],
  "transaction.manage": ["owner", "admin", "member"],
  "payment.record": ["owner", "admin", "member"],
  "settlement.manage": ["owner", "admin", "member"],
  "billing.manage": ["owner", "admin"],
  "team.manage": ["owner", "admin"],
  "org.edit": ["owner", "admin"],
  "settings.own": ["owner", "admin", "member", "viewer"],
  "org.transfer_close": ["owner"],
  "audit.view": ["owner", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}

/** Flat list of (role, capability) pairs, sorted like the database function role_capability_matrix(). */
export function capabilityPairs(): { role: Role; capability: Capability }[] {
  const pairs: { role: Role; capability: Capability }[] = [];
  for (const [capability, roles] of Object.entries(CAPABILITIES) as [Capability, readonly Role[]][]) {
    for (const role of roles) pairs.push({ role, capability });
  }
  const roleOrder = (r: Role) => ROLES.indexOf(r);
  return pairs.sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.capability.localeCompare(b.capability));
}
