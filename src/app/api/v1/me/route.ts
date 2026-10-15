import { CAPABILITIES, can, type Capability } from "@/lib/permissions";
import { route } from "@/server/http";
import { userClient } from "@/server/supabase/server";

// The signed-in person, their organisations and what they may do in the active one. Read through row-level security.
export const GET = route({ auth: "user" }, async ({ ctx }) => {
  const supabase = await userClient();
  const orgIds = ctx.memberships.map((m) => m.orgId);
  const [{ data: profile }, { data: orgs }] = await Promise.all([
    supabase.from("user_profiles").select("full_name, email, designation").eq("id", ctx.user!.id).maybeSingle(),
    orgIds.length
      ? supabase.from("organisations").select("id, legal_name, trade_name, status").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; legal_name: string; trade_name: string | null; status: string }[] }),
  ]);
  const byId = new Map((orgs ?? []).map((o) => [o.id, o]));

  return {
    user: {
      id: ctx.user!.id,
      phone: ctx.user!.phone,
      email: ctx.user!.email,
      fullName: profile?.full_name ?? null,
      designation: profile?.designation ?? null,
    },
    activeOrgId: ctx.orgId,
    role: ctx.role,
    memberships: ctx.memberships.map((m) => ({
      orgId: m.orgId,
      role: m.role,
      legalName: byId.get(m.orgId)?.legal_name ?? null,
      tradeName: byId.get(m.orgId)?.trade_name ?? null,
      status: byId.get(m.orgId)?.status ?? null,
    })),
    capabilities: (Object.keys(CAPABILITIES) as Capability[]).filter((c) => can(ctx.role, c)),
  };
});
