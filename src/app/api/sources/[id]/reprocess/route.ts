import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSource, updateSource, updateSourceContent, setSourceError, updateSourceSummary } from "@/lib/db/sources";
import { getClient } from "@/lib/db/clients";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractImageContent, formatImageContentForRAG } from "@/lib/ai/vision";
import { generateSourceSummary } from "@/lib/ai/source-summary";
import { generateClarityInsightsFromSource } from "@/lib/ai/clarity-insights";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const source = await getSource(params.id, user.id);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Get client for context (only if source has a clientId)
    const client = source.clientId ? await getClient(source.clientId, user.id) : null;

    // Update status to processing
    await updateSource(params.id, user.id, { processingStatus: "processing" });

    // Build user profile for AI context
    const userProfile = {
      name: user.name,
      nickname: user.nickname,
      bio: user.bio,
      specialties: user.specialties,
      businessName: user.businessName,
    };

    // Start async reprocessing - include existing content for sources without blobUrl
    reprocessSource(params.id, source.clientId, user.id, {
      ...source,
      existingContent: source.content, // Pass existing content for session transcripts, notes, etc.
    }, userProfile, client?.name).catch(console.error);

    return NextResponse.json({ success: true, message: "Reprocessing started" });
  } catch (error) {
    console.error("Reprocess error:", error);
    return NextResponse.json({ error: "Reprocessing failed" }, { status: 500 });
  }
}

async function reprocessSource(
  sourceId: string,
  clientId: string | null,
  userId: string,
  source: {
    type: string;
    name: string;
    blobUrl: string | null;
    fileType: string | null;
    clientId: string;
    existingContent?: string | null; // For sources stored directly in DB (session transcripts, notes)
  },
  userProfile: {
    name?: string | null;
    nickname?: string | null;
    bio?: string | null;
    specialties?: string[] | null;
    businessName?: string | null;
  },
  clientName?: string | null
) {
  try {
    let content = "";

    // Handle images with Vision AI
    if (source.type === "image" && source.blobUrl) {
      console.log(`Reprocessing image with Vision AI: ${source.name}`);
      
      const extraction = await extractImageContent(source.blobUrl, {
        fileName: source.name,
      });

      content = formatImageContentForRAG({
        ...extraction,
        fileName: source.name,
      });

      console.log(`Image content extracted: ${content.slice(0, 200)}...`);
    } else if (source.blobUrl) {
      // For documents, re-fetch from blob storage
      const response = await fetch(source.blobUrl);
      const text = await response.text();
      content = text;
    } else if (source.existingContent) {
      // For sources without blobUrl (session transcripts, notes), use existing content
      console.log(`Using existing content for: ${source.name} (${source.existingContent.length} chars)`);
      content = source.existingContent;
    }

    if (!content) {
      throw new Error("No content could be extracted - source has no blobUrl and no stored content");
    }

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content);

    // Generate AI summary for the source
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`[Reprocess] Generating AI summary for: ${source.name}`);
      try {
        const summary = await generateSourceSummary(content, {
          fileName: source.name,
          fileType: source.fileType || undefined,
          sourceType: source.type,
          clientName: clientName || undefined,
          userProfile,
        });
        await updateSourceSummary(sourceId, userId, summary);
        console.log(`[Reprocess] AI summary SAVED for: ${source.name}`);
      } catch (summaryError) {
        console.error(`[Reprocess] AI summary FAILED for ${source.name}:`, summaryError);
        // Don't throw - continue with embeddings
      }
    } else {
      console.log(`[Reprocess] Skipping AI summary - content starts with error marker`);
    }

    // Generate embeddings for RAG
    if (content && !content.startsWith("[")) {
      console.log(`[Reprocess] Generating embeddings for: ${source.name}`);
      try {
        await processSourceEmbeddings(sourceId, clientId, userId, false, content, {
          type: source.type,
          fileType: source.fileType || undefined,
          fileName: source.name,
        });
        console.log(`[Reprocess] Embeddings completed for: ${source.name}`);
      } catch (embError) {
        console.error(`[Reprocess] Embeddings FAILED for ${source.name}:`, embError);
      }
    }

    // Generate clarity insights from the source content
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`[Reprocess] Generating clarity insights for: ${source.name}`);
      try {
        await generateClarityInsightsFromSource(content, {
          sourceId,
          clientId,
          userId,
          sourceName: source.name,
          sourceType: source.type,
          userProfile,
        });
        console.log(`[Reprocess] Clarity insights completed for: ${source.name}`);
      } catch (insightsError) {
        console.error(`[Reprocess] Clarity insights FAILED for ${source.name}:`, insightsError);
      }
    }

    // Mark as completed
    console.log(`[Reprocess] Marking source as completed: ${source.name}`);
    await updateSource(sourceId, userId, { processingStatus: "completed", processingError: null });
    console.log(`[Reprocess] DONE: ${source.name}`);
  } catch (error) {
    console.error("[Reprocess] FATAL ERROR:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}
