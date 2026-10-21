import { toJsonSafe } from "@/lib/money";
import { billingSummary } from "@/server/billing/service";
import { route } from "@/server/http";

// Plan and wallet balance of the active organisation (top bar and S19). Every member may see them.
export const GET = route({ capability: "dashboard.view" }, async ({ ctx }) => toJsonSafe(await billingSummary(ctx.orgId!)));
