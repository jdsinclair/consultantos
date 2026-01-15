import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { getSession, updateSession } from "@/lib/db/sessions";
import { createSource, updateSourceContent } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractImageContent, formatImageContentForRAG } from "@/lib/ai/vision";
import type { SessionAttachment } from "@/db/schema";
import pdf from "pdf-parse";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

/**
 * Sanitize content for PostgreSQL - removes null bytes and invalid UTF8
 */
function sanitizeForDB(content: string): string {
  if (!content) return "";
  return content.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function getFileType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    doc: "doc",
    docx: "docx",
    txt: "txt",
    md: "md",
    png: "png",
    jpg: "jpg",
    jpeg: "jpeg",
    gif: "gif",
    webp: "webp",
  };
  return typeMap[extension] || "unknown";
}

/**
 * POST /api/sessions/[id]/attachments
 * Add attachments to an existing session
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const sessionId = params.id;

    // Get existing session
    const session = await getSession(sessionId, user.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const existingAttachments: SessionAttachment[] = (session.attachments as SessionAttachment[]) || [];
    const newAttachments: SessionAttachment[] = [];
    const filesToProcess: Array<{ file: File; attachment: SessionAttachment }> = [];

    // Process all uploaded files
    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (key.startsWith("file_") && value instanceof File) {
        const file = value;
        const typeKey = key.replace("file_", "type_");
        const descKey = key.replace("file_", "desc_");
        const attachmentType = (formData.get(typeKey) as string) || "other";
        const description = formData.get(descKey) as string;

        // Upload to Vercel Blob
        const blob = await put(
          `sessions/${user.id}/${session.clientId}/${Date.now()}-${file.name}`,
          file,
          { access: "public" }
        );

        const attachment: SessionAttachment = {
          id: `att-${Date.now()}-${newAttachments.length}`,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          blobUrl: blob.url,
          type: attachmentType as SessionAttachment["type"],
          description: description || undefined,
          addedToSources: false,
        };

        newAttachments.push(attachment);
        filesToProcess.push({ file, attachment });
      }
    }

    if (newAttachments.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Combine existing and new attachments
    const allAttachments = [...existingAttachments, ...newAttachments];

    // Update session with new attachments immediately
    await updateSession(sessionId, user.id, { attachments: allAttachments });

    // Process attachments to sources in background (don't block response)
    processAttachmentsToSources(
      sessionId,
      session.clientId,
      user.id,
      filesToProcess,
      allAttachments
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      attachments: allAttachments,
      added: newAttachments.length,
    });
  } catch (error) {
    console.error("Failed to add attachments:", error);
    return NextResponse.json(
      { error: "Failed to add attachments" },
      { status: 500 }
    );
  }
}

/**
 * Process attachments -> create sources and RAG embeddings
 */
async function processAttachmentsToSources(
  sessionId: string,
  clientId: string,
  userId: string,
  filesToProcess: Array<{ file: File; attachment: SessionAttachment }>,
  allAttachments: SessionAttachment[]
) {
  for (const { file, attachment } of filesToProcess) {
    try {
      const fileType = getFileType(file.name);
      const isImage = attachment.type === "whiteboard" || ["png", "jpg", "jpeg", "gif", "webp"].includes(fileType);
      const sourceType = attachment.type === "recording" ? "recording" : isImage ? "image" : "document";

      // Create source record
      const source = await createSource({
        clientId,
        userId,
        type: sourceType,
        name: `[Session] ${file.name}`,
        blobUrl: attachment.blobUrl,
        fileType,
        fileSize: file.size,
        metadata: {
          sessionId,
          attachmentId: attachment.id,
          attachmentType: attachment.type,
          description: attachment.description,
        },
        processingStatus: "processing",
      });

      // Update attachment with source reference
      attachment.addedToSources = true;
      attachment.sourceId = source.id;

      // Extract content based on file type
      let content = "";

      if (fileType === "pdf") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const data = await pdf(buffer);
          content = data.text || "";
          content = content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        } catch {
          content = "[Error extracting PDF content]";
        }
      } else if (["txt", "md"].includes(fileType)) {
        content = await file.text();
      } else if (isImage && attachment.blobUrl) {
        // Use Vision AI to extract content from images
        try {
          console.log(`[Session Attachment] Extracting content from image: ${file.name}`);
          const extraction = await extractImageContent(attachment.blobUrl, {
            fileName: file.name,
          });
          content = formatImageContentForRAG({
            ...extraction,
            fileName: file.name,
          });
          console.log(`[Session Attachment] Vision AI extracted ${content.length} chars from: ${file.name}`);
        } catch (visionError) {
          console.error(`[Session Attachment] Vision AI failed for ${file.name}:`, visionError);
          content = attachment.description || `[Image: ${file.name}]`;
        }
      } else {
        try {
          content = await file.text();
        } catch {
          content = `[${attachment.type}: ${file.name}]`;
        }
      }

      // Sanitize content
      content = sanitizeForDB(content);

      // Update source with content
      await updateSourceContent(source.id, userId, content);

      // Generate embeddings for RAG (if we have meaningful text)
      if (content && content.length > 50 && !content.startsWith("[Error")) {
        await processSourceEmbeddings(source.id, clientId, userId, content, {
          type: sourceType,
          fileType,
          fileName: file.name,
          sessionId,
        });

        // Mark as completed
        const { db } = await import("@/db");
        const { sources } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        await db
          .update(sources)
          .set({ processingStatus: "completed" })
          .where(eq(sources.id, source.id));
      }
    } catch (error) {
      console.error(`Failed to process attachment ${attachment.filename}:`, error);
    }
  }

  // Update session with updated attachments (including source references)
  await updateSession(sessionId, userId, { attachments: allAttachments });
}

/**
 * DELETE /api/sessions/[id]/attachments
 * Remove an attachment from a session
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const sessionId = params.id;
    const { attachmentId } = await req.json();

    if (!attachmentId) {
      return NextResponse.json({ error: "attachmentId required" }, { status: 400 });
    }

    // Get existing session
    const session = await getSession(sessionId, user.id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existingAttachments: SessionAttachment[] = (session.attachments as SessionAttachment[]) || [];
    const updatedAttachments = existingAttachments.filter((a) => a.id !== attachmentId);

    if (updatedAttachments.length === existingAttachments.length) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Update session
    await updateSession(sessionId, user.id, { attachments: updatedAttachments });

    return NextResponse.json({
      success: true,
      attachments: updatedAttachments,
    });
  } catch (error) {
    console.error("Failed to remove attachment:", error);
    return NextResponse.json(
      { error: "Failed to remove attachment" },
      { status: 500 }
    );
  }
}
