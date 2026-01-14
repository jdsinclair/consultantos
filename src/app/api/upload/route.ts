import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { createSource, updateSourceContent, setSourceError, updateSourceSummary, updateSourceName } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractImageContent, formatImageContentForRAG } from "@/lib/ai/vision";
import { generateSourceSummary, generateSourceName } from "@/lib/ai/source-summary";
import { generateClarityInsightsFromSource } from "@/lib/ai/clarity-insights";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "No client ID provided" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`${user.id}/${clientId}/${file.name}`, file, {
      access: "public",
    });

    // Determine file type and source type
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const fileType = getFileType(extension);
    const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension);
    const sourceType = isImage ? "image" : "document";

    // Create source record (store original name, will update with AI name after processing)
    const source = await createSource({
      clientId,
      userId: user.id,
      type: sourceType,
      name: file.name, // Temporary, will be replaced with AI-generated name
      originalName: file.name, // Keep original filename
      blobUrl: blob.url,
      fileType,
      fileSize: file.size,
      processingStatus: "processing",
    });

    // Get client name for context
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    // Start async processing (text extraction + embeddings + AI summary)
    processDocument(
      source.id,
      clientId,
      user.id,
      blob.url,
      fileType,
      file,
      isImage,
      client?.name
    ).catch(console.error);

    return NextResponse.json({
      source,
      blobUrl: blob.url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
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
    // Image types
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
  file: File,
  isImage: boolean,
  clientName?: string
) {
  try {
    let content = "";

    // Handle images with Vision AI
    if (isImage) {
      console.log(`Processing image with Vision AI: ${file.name}`);
      const extraction = await extractImageContent(blobUrl, {
        clientName,
        fileName: file.name,
      });

      content = formatImageContentForRAG({
        ...extraction,
        fileName: file.name,
      });

      console.log(`Image content extracted: ${content.slice(0, 200)}...`);
    } else {
      // Extract text based on file type
      switch (fileType) {
        case "pdf":
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdf(buffer);
            content = data.text || "";

            // Clean up the text
            content = content
              .replace(/\r\n/g, "\n")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
          } catch (pdfError) {
            console.error("PDF parsing error:", pdfError);
            content = "[Error extracting PDF content]";
          }
          break;

        case "txt":
        case "md":
          content = await file.text();
          break;

        case "csv":
          content = await file.text();
          content = `[CSV Data]\n${content}`;
          break;

        case "json":
          const jsonText = await file.text();
          try {
            const parsed = JSON.parse(jsonText);
            content = JSON.stringify(parsed, null, 2);
          } catch {
            content = jsonText;
          }
          break;

        case "docx":
          try {
            const arrayBuffer = await file.arrayBuffer();
            const text = new TextDecoder().decode(arrayBuffer);
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
            content = await file.text();
          } catch {
            content = "[Unsupported file type - could not extract content]";
          }
      }
    }

    // Update source with extracted content
    await updateSourceContent(sourceId, userId, content);

    // Generate AI name and summary for the source
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating AI name for: ${file.name}`);

      // Generate AI-friendly name
      try {
        const aiName = await generateSourceName(content, {
          originalFileName: file.name,
          fileType,
          clientName,
        });
        if (aiName && aiName !== file.name) {
          await updateSourceName(sourceId, userId, aiName);
          console.log(`AI name generated: ${aiName}`);
        }
      } catch (error) {
        console.error("Failed to generate AI name:", error);
      }

      // Generate AI summary
      console.log(`Generating AI summary for: ${file.name}`);
      const summary = await generateSourceSummary(content, {
        fileName: file.name,
        fileType,
        clientName,
        sourceType: isImage ? "image" : "document",
      });
      await updateSourceSummary(sourceId, userId, summary);
    }

    // Generate embeddings for RAG
    if (content && !content.startsWith("[")) {
      await processSourceEmbeddings(sourceId, clientId, userId, content, {
        type: isImage ? "image" : "document",
        fileType,
        fileName: file.name,
      });
    }

    // Generate clarity insights from the source content
    if (content && !content.startsWith("[Error") && !content.startsWith("[Unsupported")) {
      console.log(`Generating clarity insights for: ${file.name}`);
      await generateClarityInsightsFromSource(content, {
        sourceId,
        clientId,
        userId,
        sourceName: file.name,
        sourceType: isImage ? "image" : "document",
      });
    }
  } catch (error) {
    console.error("Document processing error:", error);
    await setSourceError(sourceId, userId, String(error));
  }
}
