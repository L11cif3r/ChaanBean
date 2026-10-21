import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { startKyc } from "@/server/kyc/service";

// v4 11.2: start KYC with DigiLocker (Aadhaar or PAN).
const body = z.object({ method: z.enum(["digilocker_aadhaar", "digilocker_pan"]) });
export const POST = route({ capability: "dashboard.view", body }, async ({ ctx, body }) => startKyc(orgCtx(ctx), body.method));
