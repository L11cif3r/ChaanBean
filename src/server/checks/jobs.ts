import "server-only";
import { z } from "zod";
import { defineJob } from "@/server/jobs/registry";
import { runCheckItem } from "./service";

// One Credit Worthiness check (PRD FR-CW-04/05): runs straight after the request that started it, with one retry.
defineJob({
  kind: "checks.run_item",
  parse: (p) => z.object({ itemId: z.uuid() }).parse(p),
  timeoutMs: 300_000, // two attempts of up to 120 s (court search, v3 16.1) plus the 2 s pause
  run: ({ itemId }) => runCheckItem(itemId),
});
