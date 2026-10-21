import { orgCtx } from "@/server/counterparties/routes";
import { createSampleReports, removeSampleReports } from "@/server/dev/sample-reports";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";

// Development only: add or remove the sample Credit Worthiness companies and reports (src/server/dev/sample-reports.ts).
export const POST = route({ capability: "check.run" }, async ({ ctx }) => {
  if (process.env.NODE_ENV === "production") throw notFound("This page");
  return createSampleReports(orgCtx(ctx));
});

export const DELETE = route({ capability: "check.run" }, async ({ ctx }) => {
  if (process.env.NODE_ENV === "production") throw notFound("This page");
  return removeSampleReports(orgCtx(ctx));
});
