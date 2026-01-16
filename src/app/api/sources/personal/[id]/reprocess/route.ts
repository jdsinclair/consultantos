import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processSourceEmbeddings } from "@/lib/rag";

// Prevent static caching
export const dynamic = "force-dynamic";

// POST - Reprocess a personal source's embeddings
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const source = await db.query.sources.findFirst({
      where: and(
        eq(sources.id, id),
        eq(sources.userId, userId),
        eq(sources.isPersonal, true)
      ),
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    if (!source.content) {
      return NextResponse.json(
        { error: "Source has no content to process" },
        { status: 400 }
      );
    }

    // Update status to processing
    await db
      .update(sources)
      .set({
        processingStatus: "processing",
        processingError: null,
      })
      .where(eq(sources.id, id));

    // Delete existing chunks
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, id));

    // Process in background
    reprocessSource(id, userId).catch((err) =>
      console.error("Reprocessing failed:", err)
    );

    return NextResponse.json({ success: true, status: "processing" });
  } catch (error) {
    console.error("Failed to reprocess source:", error);
    return NextResponse.json(
      { error: "Failed to reprocess source" },
      { status: 500 }
    );
  }
}

async function reprocessSource(sourceId: string, userId: string) {
  try {
    // Process embeddings - pass null for clientId since it's a personal source
    await processSourceEmbeddings(sourceId, null, userId, true);

    // Mark as completed
    await db
      .update(sources)
      .set({ processingStatus: "completed" })
      .where(eq(sources.id, sourceId));
  } catch (error) {
    console.error("Reprocessing error:", error);
    await db
      .update(sources)
      .set({
        processingStatus: "failed",
        processingError: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(sources.id, sourceId));
  }
}
