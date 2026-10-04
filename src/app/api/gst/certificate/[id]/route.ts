import { NextResponse } from "next/server";
import { getCertificatePdf } from "@/lib/gstn";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Certificate ID is required" }, { status: 400 });
    }

    const cert = getCertificatePdf(id);
    if (!cert) {
      return NextResponse.json(
        { error: "GST Registration Certificate not found or expired." },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1" || searchParams.has("download");

    const disposition = isDownload ? "attachment" : "inline";

    return new NextResponse(cert.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${cert.fileName}"`,
        "Content-Length": cert.buffer.length.toString(),
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load certificate" },
      { status: 500 }
    );
  }
}
