import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSource, updateSourceContent, setSourceError, updateSourceSummary, updateSourceName } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractImageContent, formatImageContentForRAG, extractPdfVisualContent, formatPdfVisualContentForRAG } from "@/lib/ai/vision";
import { generateSourceSummary, generateSourceName } from "@/lib/ai/source-summary";
import { generateClarityInsightsFromSource } from "@/lib/ai/clarity-insights";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import pdf from "pdf-parse";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { blobUrl, clientId, fileName, fileSize } = body;

    if (!blobUrl || !clientId || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: blobUrl, clientId, fileName" },
        { status: 400 }
      );
    }

    // Determine file type
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const fileType = getFileType(extension);
    const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension);
    const sourceType = isImage ? "image" : "document";

    // Create source record
    const source = await createSource({
      clientId,
      userId: user.id,
      type: sourceType,
      name: fileName,
      originalName: fileName,
      blobUrl,
      fileType,
      fileSize: fileSize || 0,
      processingStatus: "processing",
    });

    // Get client name for context
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    // Build user profile for AI context
    const userProfile = {
      name: user.name,
      nickname: user.nickname,
      bio: user.bio,
      specialties: user.specialties,
      businessName: user.businessName,
    };

    // Start async processing
    processDocument(
      source.id,
      clientId,
      user.id,
      blobUrl,
      fileType,
      fileName,
      isImage,
      client?.name,
      userProfile
    ).catch(console.error);

    return NextResponse.json({ source, blobUrl });
  } catch (error) {
    console.error("Process upload error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function getFileType(extension: string): string {
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    doc: "doc",
    docx: "docx",
    ppt: "ppt",
    pptx: "pptx",
    xls: "xls",
    xlsx: "xlsx",
    txt: "txt",
    md: "md",
    csv: "csv",
    json: "json",
    png: "png",
    jpg: "jpg",
    jpeg: "jpeg",
    gif: "gif",
    webp: "webp",
    svg: "svg",
  };
  return typeMap[extension] || "unknown";
}

async function processDocument(
  sourceId: string,
  clientId: string,
  userId: string,
  blobUrl: string,
  fileType: string,
  fileName: string,
  isImage: boolean,
  clientName?: string,
  userProfile?: {
    name?: string | null;
    nickname?: string | null;
    bio?: string | null;
    specialties?: string[] | null;
    businessName?: string | null;
  }
) {
  try {
    let content = "";

    // Fetch the file from blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Handle images with Vision AI
    if (isImage) {
      console.log(`Processing image with Vision AI: ${fileName}`);
      const extraction = await extractImageContent(blobUrl, {
        clientName,
        fileName,
      });

      content = formatImageContentForRAG({
        ...extraction,
        fileName,
      });

      console.log(`Image content extracted: ${content.slice(0, 200)}...`);
    } else {
      // Extract text based on file type
      switch (fileType) {
        case "pdf":
          try {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdf(buffer);
            let textContent = data.text || "";

            textContent = textContent
              .replace(/\r\n/g, "\n")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            content = `## Extracted Text\n\n${textContent}`;

            // Also extract visual content (charts, diagrams, images)
            console.log(`Extracting visual content from PDF: ${fileName}`);
            try {
              const visualExtraction = await extractPdfVisualContent(blobUrl, {
                clientName,
                fileName,
              });
              const visualContent = formatPdfVisualContentForRAG(visualExtraction);
              content = content + visualContent;
              console.log(`Visual content extracted for: ${fileName}`);
            } catch (visualError) {
              console.error("PDF visual extraction error (continuing with text only):", visualError);
            }
          } catch (pdfError) {
            console.error("PDF parsing error:", pdfError);
            content = "[Error extracting PDF content]";
          }
          break;

        case "txt":
        case "md":
          content = await response.text();
          break;

        case "csv":
          content = await response.text();
          content = `[CSV Data]\n${content}`;
          break;

        case "json":
          const jsonText = await response.text();
          try {
            const parsed = JSON.parse(jsonText);
            content = JSON.stringify(parsed, null, 2);
          } catch {
            content = jsonText;
          }
          break;

        case "pptx":
        case "ppt":
          // For PPT files, we'll extract what we can or note it's a presentation
          try {
            const arrayBuffer = await response.arrayBuffer();
            const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
            // Try to find text content in the PPTX XML
            const textMatches = text.match(/<a:t>([^<]*)<\/a:t>/g);
            if (textMatches && textMatches.length > 0) {
              content = textMatches
                .map(t => t.replace(/<[^>]+>/g, ""))
                .filter(t => t.trim().length > 0)
                .join("\n")
                .trim();
            }
            if (!content || content.length < 50) {
              content = `[PowerPoint presentation: ${fileName}]\n${content || "Content requires manual review"}`;
            }
          } catch {
            content = `[PowerPoint presentation: ${fileName} - Could not extract text content]`;
          }
          break;

        case "docx":
          try {
            const arrayBuffer = await response.arrayBuffer();
            const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
            const textContent = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
            if (textContent) {
              content = textContent
                .map(t => t.replace(/<[^>]+>/g, ""))
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
            } else {
              content = "[DOCX content - could not extract text]";
            }
          } catch {
            content = "[DOCX content - extraction failed]";
          }
          break;

        default:
          try {
            content = await response.text();
          } catch {
            content = "[Unsupported file type - could not extract content]";
          }
      }
    }

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content);

    // Generate AI name and summary for the source
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating AI name for: ${fileName}`);

      // Generate AI-friendly name
      try {
        const aiName = await generateSourceName(content, {
          originalFileName: fileName,
          fileType,
          clientName,
        });
        if (aiName && aiName !== fileName) {
          await updateSourceName(sourceId, userId, aiName);
          console.log(`AI name generated: ${aiName}`);
        }
      } catch (error) {
        console.error("Failed to generate AI name:", error);
      }

      // Generate AI summary
      console.log(`Generating AI summary for: ${fileName}`);
      const summary = await generateSourceSummary(content, {
        fileName,
        fileType,
        clientName,
        sourceType: isImage ? "image" : "document",
        userProfile,
      });
      await updateSourceSummary(sourceId, userId, summary);
    }

    // Generate embeddings for RAG
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      await processSourceEmbeddings(sourceId, clientId, userId, content, {
        type: isImage ? "image" : "document",
        fileType,
        fileName,
      });
    }

    // Generate clarity insights from the source content
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating clarity insights for: ${fileName}`);
      await generateClarityInsightsFromSource(content, {
        sourceId,
        clientId,
        userId,
        sourceName: fileName,
        sourceType: isImage ? "image" : "document",
        userProfile,
      });
    }
  } catch (error) {
    console.error("Document processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}
