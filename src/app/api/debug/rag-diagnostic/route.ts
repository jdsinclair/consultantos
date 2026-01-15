import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq, sql, desc, and, isNotNull } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

/**
 * Comprehensive RAG diagnostic endpoint
 * Shows exactly what's in the database and helps debug why searches return nothing
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const showSampleChunks = searchParams.get("showChunks") === "true";
    const chunkLimit = parseInt(searchParams.get("chunkLimit") || "10");

    // 1. Get source statistics
    const sourceConditions = [eq(sources.userId, user.id)];
    if (clientId) {
      sourceConditions.push(eq(sources.clientId, clientId));
    }

    const allSources = await db.query.sources.findMany({
      where: and(...sourceConditions),
      orderBy: [desc(sources.createdAt)],
      with: {
        client: {
          columns: { id: true, name: true },
        },
      },
    });

    const sourceStats = {
      total: allSources.length,
      byStatus: {
        pending: allSources.filter((s) => s.processingStatus === "pending").length,
        processing: allSources.filter((s) => s.processingStatus === "processing").length,
        completed: allSources.filter((s) => s.processingStatus === "completed").length,
        error: allSources.filter((s) => s.processingStatus === "error" || s.processingStatus === "failed").length,
      },
      byType: {} as Record<string, number>,
    };

    // Count by type
    allSources.forEach((s) => {
      sourceStats.byType[s.type] = (sourceStats.byType[s.type] || 0) + 1;
    });

    // 2. Get chunk statistics
    const chunkConditions = [eq(sourceChunks.userId, user.id)];
    if (clientId) {
      chunkConditions.push(eq(sourceChunks.clientId, clientId));
    }

    // Total chunks
    const totalChunksResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sourceChunks)
      .where(and(...chunkConditions));
    const totalChunks = Number(totalChunksResult[0]?.count || 0);

    // Chunks with embeddings
    const chunksWithEmbeddingsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sourceChunks)
      .where(and(...chunkConditions, isNotNull(sourceChunks.embedding)));
    const chunksWithEmbeddings = Number(chunksWithEmbeddingsResult[0]?.count || 0);

    // 3. Sources with their chunk counts
    const sourcesWithChunks = await Promise.all(
      allSources.slice(0, 20).map(async (source) => {
        const chunkCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(sourceChunks)
          .where(eq(sourceChunks.sourceId, source.id));
        const chunkCount = Number(chunkCountResult[0]?.count || 0);

        const embeddingCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(sourceChunks)
          .where(and(eq(sourceChunks.sourceId, source.id), isNotNull(sourceChunks.embedding)));
        const embeddingCount = Number(embeddingCountResult[0]?.count || 0);

        return {
          id: source.id,
          name: source.name,
          type: source.type,
          clientName: source.client?.name || "Unknown",
          processingStatus: source.processingStatus,
          processingError: source.processingError,
          contentLength: source.content?.length || 0,
          chunkCount,
          embeddingCount,
          hasContent: !!source.content && source.content.length > 0,
          createdAt: source.createdAt,
        };
      })
    );

    // 4. Sample chunks (if requested)
    let sampleChunks: Array<{
      id: string;
      sourceId: string;
      sourceName: string;
      content: string;
      chunkIndex: number;
      hasEmbedding: boolean;
      embeddingDimensions: number | null;
    }> = [];

    if (showSampleChunks) {
      const chunks = await db.query.sourceChunks.findMany({
        where: and(...chunkConditions),
        limit: chunkLimit,
        orderBy: [desc(sourceChunks.createdAt)],
        with: {
          source: {
            columns: { name: true },
          },
        },
      });

      sampleChunks = chunks.map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        sourceName: c.source?.name || "Unknown",
        content: c.content.substring(0, 500) + (c.content.length > 500 ? "..." : ""),
        chunkIndex: c.chunkIndex,
        hasEmbedding: !!c.embedding,
        embeddingDimensions: c.embedding ? (c.embedding as number[]).length : null,
      }));
    }

    // 5. Identify potential issues
    const issues: string[] = [];

    if (sourceStats.total === 0) {
      issues.push("No sources found - you need to upload documents first");
    }
    if (sourceStats.byStatus.pending > 0) {
      issues.push(`${sourceStats.byStatus.pending} sources are still pending processing`);
    }
    if (sourceStats.byStatus.error > 0) {
      issues.push(`${sourceStats.byStatus.error} sources failed processing - check processingError field`);
    }
    if (sourceStats.byStatus.completed > 0 && totalChunks === 0) {
      issues.push("Sources marked completed but no chunks created - processing may have failed silently");
    }
    if (totalChunks > 0 && chunksWithEmbeddings === 0) {
      issues.push("Chunks exist but none have embeddings - embedding generation failed");
    }
    if (totalChunks > 0 && chunksWithEmbeddings < totalChunks) {
      issues.push(`Only ${chunksWithEmbeddings}/${totalChunks} chunks have embeddings`);
    }

    // 6. Check for sources without content
    const sourcesWithoutContent = allSources.filter(
      (s) => s.processingStatus === "completed" && (!s.content || s.content.length === 0)
    );
    if (sourcesWithoutContent.length > 0) {
      issues.push(
        `${sourcesWithoutContent.length} completed sources have no content extracted - content extraction may have failed`
      );
    }

    return NextResponse.json({
      diagnostic: {
        timestamp: new Date().toISOString(),
        userId: user.id,
        clientFilter: clientId || "all",
      },
      sourceStats,
      chunkStats: {
        totalChunks,
        chunksWithEmbeddings,
        chunksWithoutEmbeddings: totalChunks - chunksWithEmbeddings,
      },
      sourcesWithChunks,
      sampleChunks: showSampleChunks ? sampleChunks : "Add ?showChunks=true to see sample chunks",
      issues: issues.length > 0 ? issues : ["No obvious issues detected"],
      recommendations:
        issues.length > 0
          ? [
              "Check the processingError field on failed sources",
              "Try reprocessing sources via POST /api/sources/[id]/reprocess",
              "Check server logs for embedding generation errors",
              "Verify OpenAI API key is configured correctly",
            ]
          : ["RAG system appears healthy - try searching with lower similarity threshold"],
    });
  } catch (error) {
    console.error("RAG diagnostic error:", error);
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
