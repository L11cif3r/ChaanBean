import { z } from "zod";
import { mcaImports, startMcaImport } from "@/server/companies/mca-import";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";

// Development and set-up: start importing one state of the MCA master data into our copy, and see progress.
const body = z.object({ state: z.string().min(2).max(60) });

export const GET = route({ capability: "billing.manage" }, async () => ({ imports: await mcaImports() }));

export const POST = route({ capability: "billing.manage", body }, async ({ body }) => {
  if (process.env.NODE_ENV === "production") throw notFound("This page");
  return { importId: await startMcaImport(body.state) };
});
