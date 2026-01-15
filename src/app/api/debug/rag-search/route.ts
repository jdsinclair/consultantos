import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { searchSimilarChunks } from "@/lib/rag";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const clientId = searchParams.get("clientId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results = await searchSimilarChunks(query, user.id, {
      clientId: clientId || undefined,
      limit,
    });

    return NextResponse.json({
      results: results.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.source?.name || "Unknown",
        content: r.content,
        similarity: r.similarity,
        chunkIndex: r.chunkIndex,
      })),
      query,
      count: results.length,
    });
  } catch (error) {
    console.error("RAG search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
