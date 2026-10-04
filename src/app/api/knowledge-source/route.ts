import { NextResponse } from "next/server";
import { searchKnowledgeSource, findKnowledgeEntity, getAllKnowledgeEntities } from "@/lib/knowledge-source";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const id = searchParams.get("id");
    const gstin = searchParams.get("gstin");

    if (id || gstin) {
      const entity = findKnowledgeEntity(id || gstin || "");
      if (!entity) {
        return NextResponse.json({ error: "Entity not found in Knowledge Source." }, { status: 404 });
      }
      return NextResponse.json({ success: true, entity });
    }

    if (query) {
      const results = searchKnowledgeSource(query);
      return NextResponse.json({ success: true, count: results.length, results });
    }

    const all = getAllKnowledgeEntities();
    return NextResponse.json({ success: true, count: all.length, results: all });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query knowledge source" },
      { status: 500 }
    );
  }
}
