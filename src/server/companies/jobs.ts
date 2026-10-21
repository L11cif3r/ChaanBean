import "server-only";
import { z } from "zod";
import { defineJob } from "@/server/jobs/registry";
import { importMcaPage, startMcaImport } from "./mca-import";

// v4 2.3: one page (5,000 rows) of the MCA master data import; each page queues the next.
defineJob({
  kind: "mca.import_page",
  parse: (p) => z.object({ importId: z.number().int().positive(), state: z.string().min(2).max(60) }).parse(p),
  timeoutMs: 180_000,
  run: ({ importId, state }) => importMcaPage(importId, state),
});

// 14.3: the weekly refresh of an imported state.
defineJob({
  kind: "mca.refresh",
  parse: (p) => z.object({ state: z.string().min(2).max(60) }).parse(p),
  run: async ({ state }) => { await startMcaImport(state); },
});
