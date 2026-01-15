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

    // Get client for context
    const client = await getClient(source.clientId, user.id);

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

    // Start async reprocessing
    reprocessSource(params.id, source.clientId, user.id, source, userProfile, client?.name).catch(console.error);

    return NextResponse.json({ success: true, message: "Reprocessing started" });
  } catch (error) {
    console.error("Reprocess error:", error);
    return NextResponse.json({ error: "Reprocessing failed" }, { status: 500 });
  }
}

async function reprocessSource(
  sourceId: string,
  clientId: string,
  userId: string,
  source: {
    type: string;
    name: string;
    blobUrl: string | null;
    fileType: string | null;
    clientId: string;
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
      // For documents, we need to re-fetch the file from blob storage
      const response = await fetch(source.blobUrl);
      const text = await response.text();
      content = text;
    }

    if (!content) {
      throw new Error("No content could be extracted");
    }

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content);

    // Generate AI summary for the source
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating AI summary for: ${source.name}`);
      const summary = await generateSourceSummary(content, {
        fileName: source.name,
        fileType: source.fileType || undefined,
        sourceType: source.type,
        clientName: clientName || undefined,
        userProfile,
      });
      await updateSourceSummary(sourceId, userId, summary);
    }

    // Generate embeddings for RAG
    if (content && !content.startsWith("[")) {
      await processSourceEmbeddings(sourceId, clientId, userId, content, {
        type: source.type,
        fileType: source.fileType || undefined,
        fileName: source.name,
      });
    }

    // Generate clarity insights from the source content
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating clarity insights for: ${source.name}`);
      await generateClarityInsightsFromSource(content, {
        sourceId,
        clientId,
        userId,
        sourceName: source.name,
        sourceType: source.type,
        userProfile,
      });
    }
  } catch (error) {
    console.error("Reprocessing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}
