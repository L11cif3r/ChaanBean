import "server-only";
import { z } from "zod";
import { defineJob } from "@/server/jobs/registry";
import { expireConsent, remindConsent } from "./service";

// FR-CON-07: one reminder 24 hours after the link is sent, while the buyer has not answered.
defineJob({
  kind: "consent.remind",
  parse: (p) => z.object({ consentId: z.uuid() }).parse(p),
  run: async ({ consentId }) => void (await remindConsent(consentId)),
});

// FR-CON-01: after 72 hours without an answer the request expires; waiting checks are cancelled and not charged.
defineJob({
  kind: "consent.expire",
  parse: (p) => z.object({ consentId: z.uuid() }).parse(p),
  run: async ({ consentId }) => void (await expireConsent(consentId)),
});
