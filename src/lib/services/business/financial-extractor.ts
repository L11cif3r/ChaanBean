/**
 * Financial Extractor
 * Parses raw text (from PDF) or structured rows (from XLSX/CSV)
 * into typed financial fields. NO LLM. Pure deterministic text matching.
 */

export interface ExtractedFinancials {
  // P&L fields
  revenue?: number;
  cogs?: number;
  grossProfit?: number;
  ebitda?: number;
  netProfit?: number;
  depreciation?: number;
  interestExpense?: number;
  tax?: number;

  // Balance Sheet fields
  totalAssets?: number;
  totalLiabilities?: number;
  equity?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  cash?: number;
  inventory?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  longTermDebt?: number;
  shortTermDebt?: number;

  // Bank statement fields
  bankInflows?: number;
  bankOutflows?: number;
  closingBalance?: number;

  // GST fields
  gstTurnover?: number;
  gstOutputTax?: number;
  gstInputCredit?: number;

  // Metadata
  confidence: "HIGH" | "MEDIUM" | "LOW";
  missingFields: string[];
  rawLinesMatched: number;
}

// Patterns for matching financial line items in text
const PATTERNS: Array<{ field: keyof ExtractedFinancials; patterns: RegExp[] }> = [
  {
    field: "revenue",
    patterns: [
      /(?:net\s+)?(?:revenue|turnover|sales|net\s+sales)[\s:₹]+([0-9,\.]+)/i,
      /total\s+income[\s:₹]+([0-9,\.]+)/i,
      /gross\s+revenue[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "cogs",
    patterns: [
      /(?:cost\s+of\s+(?:goods\s+sold|sales|revenue)|cogs)[\s:₹]+([0-9,\.]+)/i,
      /purchases[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "grossProfit",
    patterns: [/gross\s+profit[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "ebitda",
    patterns: [/ebitda[\s:₹]+([0-9,\.]+)/i, /operating\s+profit[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "netProfit",
    patterns: [
      /(?:net\s+profit|profit\s+after\s+tax|pat|net\s+income)[\s:₹]+([0-9,\.]+)/i,
      /profit\s+(?:\/|for\s+the\s+year)[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "depreciation",
    patterns: [/depreciation(?:\s+&\s+amortization)?[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "interestExpense",
    patterns: [/(?:interest\s+expense|finance\s+costs?)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "tax",
    patterns: [/(?:income\s+tax|tax\s+expense)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "totalAssets",
    patterns: [/total\s+assets[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "totalLiabilities",
    patterns: [
      /total\s+liabilities[\s:₹]+([0-9,\.]+)/i,
      /total\s+(?:borrowings|debt)[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "equity",
    patterns: [
      /(?:total\s+)?(?:shareholders'?\s+equity|net\s+worth|owners'?\s+equity)[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "currentAssets",
    patterns: [/current\s+assets[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "currentLiabilities",
    patterns: [/current\s+liabilities[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "cash",
    patterns: [/cash\s+(?:&|and)\s+(?:cash\s+equivalents?|bank)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "inventory",
    patterns: [/(?:inventories|stock)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "accountsReceivable",
    patterns: [/(?:trade\s+receivables?|debtors?)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "accountsPayable",
    patterns: [/(?:trade\s+payables?|creditors?)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "longTermDebt",
    patterns: [/(?:long[\s-]term\s+(?:debt|borrowings?))[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "bankInflows",
    patterns: [/(?:total\s+)?(?:credits?|receipts?|inflows?)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "bankOutflows",
    patterns: [/(?:total\s+)?(?:debits?|payments?|outflows?)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "closingBalance",
    patterns: [/closing\s+balance[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "gstTurnover",
    patterns: [
      /(?:aggregate\s+)?turnover[\s:₹]+([0-9,\.]+)/i,
      /taxable\s+(?:turnover|value)[\s:₹]+([0-9,\.]+)/i,
    ],
  },
  {
    field: "gstOutputTax",
    patterns: [/(?:output\s+tax|igst\s+payable|cgst\s+\+\s+sgst)[\s:₹]+([0-9,\.]+)/i],
  },
  {
    field: "gstInputCredit",
    patterns: [/(?:input\s+tax\s+credit|itc\s+available)[\s:₹]+([0-9,\.]+)/i],
  },
];

/** Parse a numeric string like "1,23,45,678.90" → number */
function parseIndianNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  return parseFloat(cleaned);
}

/** Extract financial fields from raw PDF text */
export function extractFromText(text: string): ExtractedFinancials {
  const result: Partial<ExtractedFinancials> = {};
  const missingFields: string[] = [];
  let rawLinesMatched = 0;

  for (const { field, patterns } of PATTERNS) {
    let matched = false;
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m && m[1]) {
        const val = parseIndianNumber(m[1]);
        if (!isNaN(val) && val >= 0) {
          (result as Record<string, unknown>)[field] = val;
          rawLinesMatched++;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      missingFields.push(field as string);
    }
  }

  // Derive computed fields where possible
  if (result.revenue && result.cogs && !result.grossProfit) {
    result.grossProfit = result.revenue - result.cogs;
  }
  if (result.grossProfit && result.revenue && result.revenue > 0 && !result.ebitda) {
    // Approximate EBITDA if depreciation and interest are known
    if (result.netProfit !== undefined && result.depreciation !== undefined && result.interestExpense !== undefined && result.tax !== undefined) {
      result.ebitda = result.netProfit + result.depreciation + result.interestExpense + result.tax;
    }
  }

  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    rawLinesMatched >= 8 ? "HIGH" : rawLinesMatched >= 4 ? "MEDIUM" : "LOW";

  return {
    ...result,
    confidence,
    missingFields,
    rawLinesMatched,
  } as ExtractedFinancials;
}

/** Extract financial fields from XLSX row data (array of objects with string keys) */
export function extractFromRows(
  rows: Array<Record<string, string | number | null>>
): ExtractedFinancials {
  // Build a pseudo-text representation from key-value rows for pattern matching
  const lines: string[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      const label = String(row[keys[0]] ?? "");
      const value = String(row[keys[1]] ?? "");
      if (label && value) {
        lines.push(`${label}: ${value}`);
      }
    } else {
      lines.push(Object.values(row).map(String).join(" "));
    }
  }
  return extractFromText(lines.join("\n"));
}
