import { NextRequest, NextResponse } from "next/server";

/**
 * EXOTEL EXOML HANDLER
 *
 * Serves XML responses to Exotel call flow engines when an outbound call connects.
 */
export async function GET(req: NextRequest) {
  return handleExoML(req);
}

export async function POST(req: NextRequest) {
  return handleExoML(req);
}

async function handleExoML(req: NextRequest) {
  const textParam = req.nextUrl.searchParams.get("text");
  const lang = req.nextUrl.searchParams.get("lang") || "en";

  const defaultReminder =
    lang === "hi"
      ? "नमस्ते। यह चानबीन की ओर से एक महत्वपूर्ण वैधानिक भुगतान सूचना है। कृपया अपने लंबित इनवॉइस का तुरंत भुगतान करें। धन्यवाद।"
      : "Namaste. This is an official statutory payment update from ChaanBean. Please settle your overdue invoice today to remain compliant with MSMED Act terms. Thank you.";

  const textToSay = escapeXml(textParam || defaultReminder);
  const safeVoiceLang = lang === "hi" ? "hi-IN" : "en-IN";

  const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="woman" language="${safeVoiceLang}">${textToSay}</Say>
    <Hangup />
</Response>`;

  return new NextResponse(exoml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}
