import "server-only";
import { sql } from "@/server/db/sql";

// Sample data mode (PRD v4.0 section 10): reports and charts can be seen before every provider key arrives. When it is
// on, checks without a live provider return sample data, nothing touches the wallet, and every screen and PDF says
// "SAMPLE DATA: not a real report". Checks with a live provider (keys set) still use real data ("Live").
// On through SAMPLE_DATA_MODE=true (development, demos) or per organisation by Ops; always off for real customers.

export const SAMPLE_PROVIDER_PREFIX = "mock";

export async function isSampleMode(orgId: string): Promise<boolean> {
  if (process.env.SAMPLE_DATA_MODE === "true") return true;
  const [o] = await sql()<{ sample_data_mode: boolean }[]>`select sample_data_mode from public.organisations where id = ${orgId}`;
  return Boolean(o?.sample_data_mode);
}

/** A section came from sample data (the dummy provider), not a live source. */
export const isSampleProvider = (provider: string | null | undefined) => Boolean(provider?.startsWith(SAMPLE_PROVIDER_PREFIX));
