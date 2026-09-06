import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateFile, classifyDocument, getStoragePath, processDocument } from "@/lib/services/business/document-processor";
import { logAuditEvent } from "@/lib/services/business/audit-logger";
import { rerunAnalysis } from "@/lib/services/business/verification-orchestrator";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.financialDocument.findMany({
      where: { businessId: id },
      include: { extractions: true },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json({ documents });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    // Verify business exists
    const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const fiscalYear = formData.get("fiscalYear") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const mimeType = file.type;
    const sizeBytes = file.size;

    // Validate
    const validation = validateFile(mimeType, sizeBytes);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Determine category
    const docCategory = classifyDocument(file.name, mimeType, category || undefined);

    // Generate unique filename
    const ext = path.extname(file.name);
    const hash = crypto.randomBytes(8).toString("hex");
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(ext, "");
    const fileName = `${safeBase}-${hash}${ext}`;

    // Store file
    const storagePath = getStoragePath(businessId, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    // Relative path for DB
    const relPath = `/uploads/businesses/${businessId}/${fileName}`;

    // Create DB record
    const doc = await prisma.financialDocument.create({
      data: {
        businessId,
        originalName: file.name,
        storagePath: relPath,
        mimeType,
        fileSizeBytes: sizeBytes,
        category: docCategory,
        fiscalYear: fiscalYear || null,
        processingStatus: "PENDING",
      },
    });

    await logAuditEvent({
      businessId,
      eventType: "DOCUMENT_UPLOADED",
      description: `Document "${file.name}" uploaded (${docCategory}, ${fiscalYear || "no year"})`,
      metadata: { documentId: doc.id, category: docCategory, fiscalYear },
    });

    // Process asynchronously (non-blocking)
    processDocument(doc.id)
      .then(() => rerunAnalysis(businessId))
      .catch(console.error);

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
