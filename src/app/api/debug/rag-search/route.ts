import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { searchSimilarChunks } from "@/lib/rag";
import { db } from "@/db";
import { sourceChunks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const clientId = searchParams.get("clientId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const minSimilarity = parseFloat(searchParams.get("minSimilarity") || "0.5");
    const raw = searchParams.get("raw") === "true"; // List chunks without search

    // RAW MODE: Just list chunks from the database without vector search
    if (raw) {
      const conditions = [eq(sourceChunks.userId, user.id)];
      if (clientId) {
        conditions.push(eq(sourceChunks.clientId, clientId));
      }

      const chunks = await db.query.sourceChunks.findMany({
        where: and(...conditions),
        limit,
        orderBy: [desc(sourceChunks.createdAt)],
        with: {
          source: {
            columns: { name: true, type: true },
          },
        },
      });

      return NextResponse.json({
        mode: "raw",
        message: "Showing raw chunks from database (no vector search)",
        results: chunks.map((c) => ({
          sourceId: c.sourceId,
          sourceName: c.source?.name || "Unknown",
          sourceType: c.source?.type || "Unknown",
          content: c.content,
          chunkIndex: c.chunkIndex,
          hasEmbedding: !!c.embedding,
          embeddingDimensions: c.embedding ? (c.embedding as number[]).length : 0,
        })),
        count: chunks.length,
        help: "Use ?query=... to perform vector search, or ?raw=true&limit=50 to see more chunks",
      });
    }

    // SEARCH MODE: Vector similarity search
    if (!query) {
      return NextResponse.json(
        {
          error: "Query is required for search mode",
          help: "Use ?query=your search term or ?raw=true to list all chunks",
        },
        { status: 400 }
      );
    }

    console.log(`[RAG Debug] Searching for: "${query}" with minSimilarity=${minSimilarity}`);

    const results = await searchSimilarChunks(query, user.id, {
      clientId: clientId || undefined,
      limit,
      minSimilarity,
    });

    console.log(`[RAG Debug] Found ${results.length} results`);

    return NextResponse.json({
      mode: "search",
      results: results.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.source?.name || "Unknown",
        content: r.content,
        similarity: r.similarity,
        similarityPercent: `${(r.similarity * 100).toFixed(1)}%`,
        chunkIndex: r.chunkIndex,
      })),
      query,
      minSimilarity,
      count: results.length,
      help:
        results.length === 0
          ? "No results found. Try: 1) Lower minSimilarity (e.g., ?minSimilarity=0.1), 2) Check ?raw=true to see if chunks exist, 3) Check /api/debug/rag-diagnostic for issues"
          : undefined,
    });
  } catch (error) {
    console.error("RAG search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
