import type { CreditPolicyParams } from "./credit-engine";

// Mirror of credit_policies version 1 as seeded by migration 20261008120000_company_check.
// The database row is the source of truth at runtime; this copy is for tests and fixtures.
export const POLICY_V1: CreditPolicyParams = {
  base_pct: 0.01,
  growth_bands: [
    { min_cagr: 0.15, mult: 1.25 },
    { min_cagr: 0.0, mult: 1.0 },
    { min_cagr: -0.15, mult: 0.75 },
    { min_cagr: null, mult: 0.5 },
  ],
  gst_bands: [
    { min_ratio: 0.9, mult: 1.0 },
    { min_ratio: 0.7, mult: 0.85 },
    { min_ratio: null, mult: 0.6 },
  ],
  gst_missing_mult: 1.0,
  young_company_years: 2,
  young_company_mult: 0.75,
  max_limit_paise: 5_000_000_000, // ₹5 crore
  round_down_paise: 100_000,
  hard_stop_statuses: ["STRIKE_OFF", "UNDER_LIQUIDATION", "DISSOLVED", "AMALGAMATED"],
  weights: { financial: 35, gst: 25, stability: 20, management: 10, borrowing: 10 },
  band_cutoffs: { LOW: 75, MODERATE: 55, HIGH: 35 },
  exceed_high_risk_ratio: 2,
};
