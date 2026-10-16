import { handlePaymentWebhook } from "@/server/billing/service";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";

// Payment gateway webhook (FR-BIL-02). Public, but only events with a valid gateway signature are applied; repeated
// deliveries are recognised by event id and change nothing.
export const POST = route({ auth: "public" }, async ({ req, params }) => {
  const provider = typeof params.provider === "string" ? params.provider : "";
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(provider)) throw notFound("This payment provider");
  const result = await handlePaymentWebhook(provider, await req.text(), req.headers);
  return { received: true, outcome: result.outcome };
});
