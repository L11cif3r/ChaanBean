import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { completeKyc } from "@/server/kyc/service";

// v4 11.2: back from DigiLocker (the test page in development).
const body = z.object({ state: z.string().min(10).max(600), approved: z.boolean() });
export const POST = route({ capability: "dashboard.view", body }, async ({ ctx, body }) => completeKyc(orgCtx(ctx), body.state, { approved: body.approved }));
