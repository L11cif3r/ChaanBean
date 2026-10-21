// Every route in PRD 6.2, with the screen it shows and the project part that builds it (docs/PARTS.md).
// Placeholder pages and the end-to-end smoke test both read this list.

export type ScreenId =
  | "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08" | "S09" | "S10" | "S11"
  | "S12" | "S13" | "S14" | "S15" | "S16" | "S17" | "S18" | "S19" | "S20" | "S21" | "S22"
  | "TXL" | "STL";

export type ScreenArea = "auth" | "app" | "public" | "internal";

export interface Screen {
  id: ScreenId;
  /** Route pattern as in PRD 6.2; [param] marks a dynamic segment. */
  path: string;
  /** A concrete URL for the smoke test. */
  sample: string;
  area: ScreenArea;
  part: number;
}

export const SCREENS: Screen[] = [
  { id: "S01", path: "/login", sample: "/login", area: "auth", part: 2 },
  { id: "S02", path: "/signup/business", sample: "/signup/business", area: "auth", part: 2 },
  { id: "S03", path: "/signup/plan", sample: "/signup/plan", area: "auth", part: 3 },
  { id: "S03", path: "/account/plan/change", sample: "/account/plan/change", area: "app", part: 3 },
  { id: "S04", path: "/dashboard", sample: "/dashboard", area: "app", part: 10 },
  { id: "S05", path: "/counterparties", sample: "/counterparties", area: "app", part: 4 },
  { id: "S06", path: "/counterparties/new", sample: "/counterparties/new", area: "app", part: 4 },
  { id: "S07", path: "/counterparties/[id]", sample: "/counterparties/sample", area: "app", part: 4 },
  { id: "S08", path: "/checks/new", sample: "/checks/new", area: "app", part: 5 },
  { id: "S09", path: "/checks/new/details", sample: "/checks/new/details", area: "app", part: 5 },
  { id: "S10", path: "/c/[token]", sample: "/c/sample", area: "public", part: 8 },
  { id: "S11", path: "/reports/[id]", sample: "/reports/sample", area: "app", part: 5 },
  { id: "S12", path: "/cases", sample: "/cases", area: "app", part: 8 },
  { id: "TXL", path: "/transactions", sample: "/transactions", area: "app", part: 9 },
  { id: "S13", path: "/transactions/new", sample: "/transactions/new", area: "app", part: 9 },
  { id: "S14", path: "/transactions/[id]/review", sample: "/transactions/sample/review", area: "app", part: 9 },
  { id: "S15", path: "/a/[token]", sample: "/a/sample", area: "public", part: 9 },
  { id: "S15", path: "/s/[token]", sample: "/s/sample", area: "public", part: 9 },
  { id: "S16", path: "/transactions/[id]", sample: "/transactions/sample", area: "app", part: 9 },
  { id: "STL", path: "/settlements", sample: "/settlements", area: "app", part: 9 },
  { id: "S17", path: "/settlements/new", sample: "/settlements/new", area: "app", part: 9 },
  { id: "S18", path: "/account/team", sample: "/account/team", area: "app", part: 2 },
  { id: "S19", path: "/account/billing", sample: "/account/billing", area: "app", part: 3 },
  { id: "S20", path: "/settings/notifications", sample: "/settings/notifications", area: "app", part: 6 },
  { id: "S21", path: "/admin", sample: "/admin", area: "internal", part: 10 },
  { id: "S22", path: "/v/[reference]", sample: "/v/CHB-TX-0001", area: "public", part: 9 },
];

export const screen = (id: ScreenId): Screen => {
  const s = SCREENS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown screen ${id}`);
  return s;
};

/** Sidebar groups, as in the PRD v2.0 screens: Workspace, the three main tabs (plus E-Settlement), Account. */
export const NAV = [
  { group: "workspace", items: [{ id: "S04", key: "dashboard" }, { id: "S05", key: "counterparties" }] },
  {
    group: "mainTabs",
    items: [{ id: "S08", key: "creditCheck" }, { id: "S12", key: "caseCheck" }, { id: "TXL", key: "transactions" }, { id: "STL", key: "settlements" }],
  },
  { group: "account", items: [{ id: "S18", key: "team" }, { id: "S19", key: "billing" }, { id: "S20", key: "settings" }] },
] as const satisfies readonly { group: string; items: readonly { id: ScreenId; key: string }[] }[];
