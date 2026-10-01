import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Storage & Buffer Manager for GSTN Registration Certificate PDFs
 * 
 * Safely decodes Base64-encoded PDF documents returned by GSTN /rc/validate,
 * validates file integrity (%PDF signature), persists to disk, and provides
 * retrieval methods for in-app viewing and statutory downloading.
 */

// Memory cache to serve certificates quickly without repeated disk I/O
const certificateCache = new Map<string, { buffer: Buffer; fileName: string; gstin: string }>();

const STORAGE_DIR = path.join(process.cwd(), "storage", "certificates", "gstn");

function ensureDirectoryExists(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export interface SaveCertificateResult {
  certificateId: string;
  fileName: string;
  filePath: string;
  byteSize: number;
}

/**
 * Decodes a Base64-encoded GST Registration Certificate PDF and stores it on disk.
 */
export function saveCertificatePdf(params: {
  gstin: string;
  txnId: string;
  rcPdfBase64: string;
}): SaveCertificateResult {
  const { gstin, txnId, rcPdfBase64 } = params;

  if (!rcPdfBase64 || typeof rcPdfBase64 !== "string") {
    throw new Error("Invalid or empty rcPdf payload received from GSTN API.");
  }

  // Clean base64 string (strip data URI prefix if present)
  const cleanBase64 = rcPdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = Buffer.from(cleanBase64, "base64");
  } catch (err) {
    throw new Error(`Failed to decode Base64 certificate PDF: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (pdfBuffer.length === 0) {
    throw new Error("Decoded GST Registration Certificate PDF is empty (0 bytes).");
  }

  // Validate PDF header (%PDF-1.)
  const header = pdfBuffer.slice(0, 5).toString("utf-8");
  if (!header.startsWith("%PDF")) {
    throw new Error(`Invalid PDF signature received from GSTN. Header: "${header}". Expected "%PDF".`);
  }

  // Generate deterministic or collision-free certificate ID
  const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex").slice(0, 12);
  const certificateId = `GST-RC-${gstin.toUpperCase()}-${hash}`;
  const fileName = `${certificateId}.pdf`;

  ensureDirectoryExists();
  const filePath = path.join(STORAGE_DIR, fileName);

  fs.writeFileSync(filePath, pdfBuffer);

  // Cache in memory
  certificateCache.set(certificateId, {
    buffer: pdfBuffer,
    fileName,
    gstin: gstin.toUpperCase(),
  });

  return {
    certificateId,
    fileName,
    filePath,
    byteSize: pdfBuffer.length,
  };
}

/**
 * Retrieves a stored certificate PDF buffer by certificateId.
 */
export function getCertificatePdf(certificateId: string): { buffer: Buffer; fileName: string; gstin: string } | null {
  // Check memory cache first
  if (certificateCache.has(certificateId)) {
    return certificateCache.get(certificateId)!;
  }

  // Fallback to disk
  ensureDirectoryExists();
  const fileName = certificateId.endsWith(".pdf") ? certificateId : `${certificateId}.pdf`;
  const filePath = path.join(STORAGE_DIR, fileName);

  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    const gstin = certificateId.split("-")[2] || "TAX";
    const record = { buffer, fileName, gstin };
    certificateCache.set(certificateId, record);
    return record;
  }

  return null;
}
