import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sources, sessions } from "@/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { generateEmbedding } from "@/lib/rag";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  query: z.string().min(1),
  clientId: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(20),
  minSimilarity: z.number().min(0).max(1).default(0.6),
  // Filter by source types - default to transcript types
  sourceTypes: z.array(z.string()).default(["session_transcript", "session_notes"]),
  // Include full text search fallback
  includeTextSearch: z.boolean().default(true),
});

interface SearchResult {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  content: string;
  similarity: number;
  sessionId?: string;
  sessionTitle?: string;
  sessionDate?: string;
  clientId: string;
  clientName?: string;
  matchType: "semantic" | "text";
}

// POST - search transcripts semantically
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { query, clientId, limit, minSimilarity, sourceTypes, includeTextSearch } =
      searchSchema.parse(body);

    const results: SearchResult[] = [];

    // 1. Semantic search using embeddings
    try {
      const queryEmbedding = await generateEmbedding(query);
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      // Build source type filter
      const typeConditions = sourceTypes.map((t) => `s.type = '${t}'`).join(" OR ");

      const clientCondition = clientId
        ? sql`AND sc.client_id = ${clientId}`
        : sql``;

      const semanticResults = await db.execute(sql`
        SELECT
          sc.id,
          sc.content,
          sc.source_id,
          s.name as source_name,
          s.type as source_type,
          s.metadata,
          sc.client_id,
          c.name as client_name,
          1 - (sc.embedding <=> ${embeddingStr}::vector) as similarity
        FROM source_chunks sc
        JOIN sources s ON s.id = sc.source_id
        JOIN clients c ON c.id = sc.client_id
        WHERE sc.user_id = ${userId}
          ${clientCondition}
          AND sc.embedding IS NOT NULL
          AND (${sql.raw(typeConditions)})
          AND 1 - (sc.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
        ORDER BY sc.embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `);

      for (const row of semanticResults.rows as Array<{
        id: string;
        content: string;
        source_id: string;
        source_name: string;
        source_type: string;
        metadata: { sessionId?: string } | null;
        client_id: string;
        client_name: string;
        similarity: number;
      }>) {
        // Get session info if available
        let sessionInfo: { title?: string; sessionDate?: Date | null } | null = null;
        if (row.metadata?.sessionId) {
          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, row.metadata.sessionId),
            columns: { title: true, sessionDate: true },
          });
          sessionInfo = session || null;
        }

        results.push({
          id: row.id,
          sourceId: row.source_id,
          sourceName: row.source_name,
          sourceType: row.source_type,
          content: row.content,
          similarity: row.similarity,
          sessionId: row.metadata?.sessionId,
          sessionTitle: sessionInfo?.title,
          sessionDate: sessionInfo?.sessionDate?.toISOString(),
          clientId: row.client_id,
          clientName: row.client_name,
          matchType: "semantic",
        });
      }
    } catch (embeddingError) {
      console.error("[Transcript Search] Semantic search failed:", embeddingError);
      // Continue with text search if semantic fails
    }

    // 2. Text search fallback/supplement
    if (includeTextSearch && results.length < limit) {
      const remainingLimit = limit - results.length;
      const existingSourceIds = new Set(results.map((r) => r.sourceId));

      const conditions = [
        eq(sources.userId, userId),
        or(...sourceTypes.map((t) => eq(sources.type, t))),
        or(
          ilike(sources.content, `%${query}%`),
          ilike(sources.name, `%${query}%`)
        ),
      ];

      if (clientId) {
        conditions.push(eq(sources.clientId, clientId));
      }

      const textResults = await db.query.sources.findMany({
        where: and(...conditions),
        limit: remainingLimit + existingSourceIds.size, // Get extra in case of duplicates
        orderBy: [desc(sources.createdAt)],
        with: {
          client: {
            columns: { name: true },
          },
        },
      });

      for (const source of textResults) {
        if (existingSourceIds.has(source.id)) continue;
        if (results.length >= limit) break;

        // Get session info
        const metadata = source.metadata as { sessionId?: string } | null;
        let sessionInfo: { title?: string; sessionDate?: Date | null } | null = null;
        if (metadata?.sessionId) {
          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, metadata.sessionId),
            columns: { title: true, sessionDate: true },
          });
          sessionInfo = session || null;
        }

        // Extract relevant snippet around the query
        const content = source.content || "";
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        const matchIndex = contentLower.indexOf(queryLower);

        let snippet = "";
        if (matchIndex >= 0) {
          const start = Math.max(0, matchIndex - 100);
          const end = Math.min(content.length, matchIndex + query.length + 100);
          snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
        } else {
          snippet = content.slice(0, 200) + (content.length > 200 ? "..." : "");
        }

        results.push({
          id: `text-${source.id}`,
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          content: snippet,
          similarity: 0.5, // Text match gets a base similarity
          sessionId: metadata?.sessionId,
          sessionTitle: sessionInfo?.title,
          sessionDate: sessionInfo?.sessionDate?.toISOString(),
          clientId: source.clientId,
          clientName: source.client?.name,
          matchType: "text",
        });
      }
    }

    // Sort by similarity (semantic first, then text)
    results.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      query,
      results: results.slice(0, limit),
      count: results.length,
    });
  } catch (error) {
    console.error("Transcript search error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to search transcripts" }, { status: 500 });
  }
}

// GET - simple search via query params (for quick searches)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const clientId = searchParams.get("clientId");

    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    // Redirect to POST handler
    const body = {
      query,
      clientId: clientId || undefined,
      limit: 10,
      minSimilarity: 0.6,
    };

    // Create a new request with the body
    const response = await POST(
      new NextRequest(req.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

    return response;
  } catch (error) {
    console.error("Transcript search error:", error);
    return NextResponse.json({ error: "Failed to search transcripts" }, { status: 500 });
  }
}
