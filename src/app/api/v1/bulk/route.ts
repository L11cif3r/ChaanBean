import { z } from "zod";
import { createBulk, listBulk } from "@/server/bulk/service";
import { checkTyped, parseBulkFile, type BulkInputRow } from "@/server/bulk/rows";
import { orgCtx } from "@/server/counterparties/routes";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";

// v4 section 6: start a multiple search from typed rows (JSON) or an Excel/CSV file (form data). Matching is free.
const typedRow = z.object({
  companyName: z.string().max(160).default(""), gstin: z.string().max(20).default(""), cin: z.string().max(25).default(""),
  city: z.string().max(60).default(""), state: z.string().max(60).default(""), contactName: z.string().max(80).default(""),
  contactMobile: z.string().max(20).default(""), contactEmail: z.string().max(120).default(""),
});
const typedBody = z.object({ rows: z.array(typedRow).max(50) });

export const GET = route({ capability: "report.view" }, async ({ ctx }) => listBulk(orgCtx(ctx)));

export const POST = route({ capability: "check.run" }, async ({ req, ctx }) => {
  const c = orgCtx(ctx);
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const parsed = typedBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("validation_failed", "Please check the rows.", { rows: "Please check the rows." });
    return createBulk(c, { source: "typed", rows: checkTyped(parsed.data.rows as BulkInputRow[]) });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) throw new AppError("validation_failed", "Choose a file.", { file: "Choose an Excel or CSV file." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  return createBulk(c, { source: "file", rows: parseBulkFile(bytes, file.name), file: { name: file.name, bytes } });
});
