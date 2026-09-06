/**
 * Document Processor
 * Pipeline: UPLOAD → FILE VALIDATION → STORE → CLASSIFICATION → TEXT/TABLE EXTRACTION
 *           → STRUCTURED DATA → NORMALIZATION → FINANCIAL ANALYSIS → RISK ENGINE
 *
 * Supported formats:
 *   PDF  → pdf-parse (text extraction)
 *   XLSX → xlsx (table parsing)
 *   CSV  → xlsx (CSV parsing)
 *   PNG/JPG → MANUAL_REVIEW_REQUIRED (no OCR API in V0)
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";
import { extractFromText, extractFromRows } from "./financial-extractor";
import { recomputeFinancialSummary } from "./financial-analyser";
import path from "path";
import fs from "fs";

const UPLOAD_BASE = path.join(process.cwd(), "public", "uploads", "businesses");

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function validateFile(
  mimeType: string,
  sizeBytes: number
): { ok: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      ok: false,
      error: `Unsupported file type: ${mimeType}. Allowed: PDF, XLSX, CSV, PNG, JPG`,
    };
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Maximum: 20MB` };
  }
  return { ok: true };
}

export function getStoragePath(businessId: string, fileName: string): string {
  const dir = path.join(UPLOAD_BASE, businessId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, fileName);
}

export function classifyDocument(
  originalName: string,
  mimeType: string,
  userCategory?: string
): string {
  if (userCategory) return userCategory;

  const lower = originalName.toLowerCase();
  if (lower.includes("gstr") || lower.includes("gst_return") || lower.includes("gst return")) return "GST_RETURN";
  if (lower.includes("balance") || lower.includes("bs_")) return "BALANCE_SHEET";
  if (lower.includes("profit") || lower.includes("p&l") || lower.includes("pnl") || lower.includes("income")) return "PNL";
  if (lower.includes("bank") || lower.includes("statement") || lower.includes("passbook")) return "BANK_STATEMENT";
  if (lower.includes("itr") || lower.includes("income_tax") || lower.includes("it_return")) return "IT_RETURN";
  if (lower.includes("udyam") || lower.includes("msme")) return "UDYAM_CERT";
  if (lower.includes("mca") || lower.includes("roc")) return "MCA_EXTRACT";
  return "OTHER";
}

/** Process an uploaded document — extract text/data and store extraction results */
export async function processDocument(documentId: string): Promise<void> {
  const doc = await prisma.financialDocument.findUnique({
    where: { id: documentId },
    include: { business: true },
  });
  if (!doc) throw new Error(`Document ${documentId} not found`);

  // Mark as PROCESSING
  await prisma.financialDocument.update({
    where: { id: documentId },
    data: { processingStatus: "PROCESSING" },
  });

  try {
    const fullPath = path.join(process.cwd(), "public", doc.storagePath);

    let extractionMethod = "MANUAL_ENTRY";
    let rawText: string | undefined;
    let fields: Record<string, unknown> = {};
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";

    if (doc.mimeType === "application/pdf") {
      // Dynamically require pdf-parse to avoid server-side bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const buffer = fs.readFileSync(fullPath);
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
      extractionMethod = "PDF_PARSE";

      const extracted = extractFromText(rawText || "");
      fields = extracted as unknown as Record<string, unknown>;
      confidence = extracted.confidence;
    } else if (
      doc.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      doc.mimeType === "application/vnd.ms-excel" ||
      doc.mimeType === "text/csv"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require("xlsx");
      const workbook = XLSX.readFile(fullPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Array<Record<string, string | number | null>> = XLSX.utils.sheet_to_json(sheet, { defval: null });
      extractionMethod = "XLSX_PARSE";

      const extracted = extractFromRows(rows);
      fields = extracted as unknown as Record<string, unknown>;
      confidence = extracted.confidence;
    } else if (doc.mimeType.startsWith("image/")) {
      extractionMethod = "OCR_PENDING";
      confidence = "LOW";
      fields = { note: "Image documents require manual data entry. Please enter the key financial figures below." };

      // Create a manual review for this document
      await prisma.manualReview.create({
        data: {
          businessId: doc.businessId,
          reviewType: "DOCUMENT_EXTRACTION",
          status: "OPEN",
          promptText: `Please manually enter the key financial figures from the uploaded image document: "${doc.originalName}" (${doc.fiscalYear || "year unknown"}). Enter revenue, profit, assets, liabilities as applicable.`,
        },
      });

      await prisma.financialDocument.update({
        where: { id: documentId },
        data: { processingStatus: "MANUAL_REVIEW_REQUIRED", processedAt: new Date() },
      });

      await logAuditEvent({
        businessId: doc.businessId,
        eventType: "DOCUMENT_PROCESSED",
        description: `Image document "${doc.originalName}" requires manual data entry`,
        metadata: { documentId, category: doc.category, extractionMethod },
      });
      return;
    }

    // Store extraction
    const extraction = await prisma.financialExtraction.create({
      data: {
        documentId,
        businessId: doc.businessId,
        extractionMethod,
        rawText,
        fields: JSON.stringify(fields),
        confidence,
      },
    });

    // Store individual metrics into FinancialMetric table
    if (doc.fiscalYear) {
      const metricMap: Record<string, string> = {
        revenue: "REVENUE",
        cogs: "COGS",
        grossProfit: "GROSS_PROFIT",
        ebitda: "EBITDA",
        netProfit: "NET_PROFIT",
        totalAssets: "TOTAL_ASSETS",
        totalLiabilities: "TOTAL_LIABILITIES",
        equity: "EQUITY",
        cash: "CASH",
        bankInflows: "BANK_INFLOW",
        bankOutflows: "BANK_OUTFLOW",
        gstTurnover: "GST_TURNOVER",
        currentAssets: "CURRENT_ASSETS",
        currentLiabilities: "CURRENT_LIABILITIES",
        longTermDebt: "LONG_TERM_DEBT",
        accountsReceivable: "ACCOUNTS_RECEIVABLE",
        accountsPayable: "ACCOUNTS_PAYABLE",
      };

      for (const [jsKey, metricName] of Object.entries(metricMap)) {
        const val = fields[jsKey];
        if (typeof val === "number" && !isNaN(val)) {
          await prisma.financialMetric.upsert({
            where: {
              id: `${doc.businessId}-${doc.fiscalYear}-${metricName}`,
            },
            create: {
              id: `${doc.businessId}-${doc.fiscalYear}-${metricName}`,
              businessId: doc.businessId,
              fiscalYear: doc.fiscalYear,
              metricName,
              value: val,
              sourceDocId: documentId,
              confidence,
            },
            update: {
              value: val,
              sourceDocId: documentId,
              confidence,
            },
          });
        }
      }

      // Recompute year summary
      await recomputeFinancialSummary(doc.businessId, doc.fiscalYear);
    }

    await prisma.financialDocument.update({
      where: { id: documentId },
      data: { processingStatus: "COMPLETED", processedAt: new Date() },
    });

    await logAuditEvent({
      businessId: doc.businessId,
      eventType: "DOCUMENT_PROCESSED",
      description: `Document "${doc.originalName}" processed via ${extractionMethod} with ${confidence} confidence`,
      metadata: { documentId, extractionId: extraction.id, category: doc.category, confidence },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.financialDocument.update({
      where: { id: documentId },
      data: { processingStatus: "FAILED", processingError: errorMsg },
    });

    await logAuditEvent({
      businessId: doc.businessId,
      eventType: "DOCUMENT_PROCESSED",
      description: `Document processing failed: ${errorMsg}`,
      metadata: { documentId, error: errorMsg },
    });

    throw err;
  }
}
