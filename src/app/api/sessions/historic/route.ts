import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { createSession, updateSession } from "@/lib/db/sessions";
import { createSource, updateSourceContent } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractSessionInsights } from "@/lib/ai/extract-todos";
import { createDetectedActionItems } from "@/lib/db/action-items";
import { extractImageContent, formatImageContentForRAG } from "@/lib/ai/vision";
import { z } from "zod";
import type { SessionAttachment } from "@/db/schema";
import pdf from "pdf-parse";

/**
 * Sanitize content for PostgreSQL - removes null bytes and invalid UTF8
 */
function sanitizeForDB(content: string): string {
  if (!content) return "";
  // Remove null bytes which cause PostgreSQL UTF8 errors
  return content.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

const historicSessionSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  sessionDate: z.string(), // ISO date string
  duration: z.number().optional(), // in minutes
  transcript: z.string().optional(),
  notes: z.string().optional(),
  recordingUrl: z.string().url().optional().or(z.literal("")),
  summary: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();

    // Parse JSON data from form
    const dataStr = formData.get("data") as string;
    if (!dataStr) {
      return NextResponse.json({ error: "No session data provided" }, { status: 400 });
    }

    const data = historicSessionSchema.parse(JSON.parse(dataStr));

    // Process file attachments
    const attachments: SessionAttachment[] = [];
    const filesToProcess: Array<{ file: File; attachment: SessionAttachment }> = [];

    // Get all files from formData
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
          `sessions/${user.id}/${data.clientId}/${Date.now()}-${file.name}`,
          file,
          { access: "public" }
        );

        const attachment: SessionAttachment = {
          id: `att-${Date.now()}-${attachments.length}`,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          blobUrl: blob.url,
          type: attachmentType as SessionAttachment["type"],
          description: description || undefined,
          addedToSources: false,
        };

        attachments.push(attachment);
        filesToProcess.push({ file, attachment });
      }
    }

    // Create the historic session
    const session = await createSession({
      userId: user.id,
      clientId: data.clientId,
      title: data.title,
      status: "completed",
      isHistoric: true,
      sessionDate: new Date(data.sessionDate),
      startedAt: new Date(data.sessionDate),
      endedAt: data.duration
        ? new Date(new Date(data.sessionDate).getTime() + data.duration * 60000)
        : new Date(data.sessionDate),
      duration: data.duration ? data.duration * 60 : undefined, // convert to seconds
      transcript: data.transcript || undefined,
      notes: data.notes || undefined,
      recordingUrl: data.recordingUrl || undefined,
      summary: data.summary || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Process attachments -> create sources (async, don't block response)
    if (filesToProcess.length > 0) {
      processAttachmentsToSources(
        session.id,
        data.clientId,
        user.id,
        filesToProcess,
        attachments
      ).catch(console.error);
    }

    // Process session content in background
    // 1. Transcript → RAG + extract insights
    if (data.transcript && data.transcript.trim().length > 100) {
      processTranscriptToRAG(
        session.id,
        data.clientId,
        user.id,
        data.title,
        data.transcript
      ).catch((err) => {
        console.error("Failed to process transcript to RAG:", err);
      });

      // Extract comprehensive insights (action items, next steps, decisions)
      processSessionInsights(
        session.id,
        data.clientId,
        user.id,
        data.title,
        data.transcript
      ).catch((err) => {
        console.error("Failed to extract insights from historic session:", err);
      });
    }

    // 2. Notes → RAG
    if (data.notes && data.notes.trim().length > 50) {
      processNotesToRAG(
        session.id,
        data.clientId,
        user.id,
        data.title,
        data.notes
      ).catch((err) => {
        console.error("Failed to process notes to RAG:", err);
      });
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Historic session creation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create historic session" }, { status: 500 });
  }
}

/**
 * Process session transcript into RAG
 * Creates a source record and generates embeddings
 */
async function processTranscriptToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string
) {
  console.log(`[Session RAG] Processing transcript for session: ${sessionTitle}`);

  // Create source for transcript
  const source = await createSource({
    clientId,
    userId,
    type: "session_transcript",
    name: `Session Transcript: ${sessionTitle}`,
    metadata: {
      sessionId,
      contentType: "transcript",
    },
    processingStatus: "processing",
  });

  // Sanitize and format transcript
  const cleanTranscript = sanitizeForDB(transcript);
  const formattedContent = `# Session Transcript: ${sessionTitle}\n\n${cleanTranscript}`;

  // Update source with content
  await updateSourceContent(source.id, userId, formattedContent);

  // Generate embeddings for RAG
  await processSourceEmbeddings(source.id, clientId, userId, formattedContent, {
    type: "session_transcript",
    sessionId,
    sessionTitle,
  });

  // Mark as completed
  const { db } = await import("@/db");
  const { sources } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(sources)
    .set({ processingStatus: "completed" })
    .where(eq(sources.id, source.id));

  console.log(`[Session RAG] Successfully indexed transcript for: ${sessionTitle} (source: ${source.id})`);
}

async function processAttachmentsToSources(
  sessionId: string,
  clientId: string,
  userId: string,
  filesToProcess: Array<{ file: File; attachment: SessionAttachment }>,
  allAttachments: SessionAttachment[]
) {
  for (const { file, attachment } of filesToProcess) {
    try {
      // Determine source type based on attachment type
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

      // Sanitize content to prevent UTF8 errors
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
  const { updateSession } = await import("@/lib/db/sessions");
  await updateSession(sessionId, userId, {
    attachments: allAttachments,
  });
}

function getFileType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    doc: "doc",
    docx: "docx",
    ppt: "ppt",
    pptx: "pptx",
    txt: "txt",
    md: "md",
    png: "png",
    jpg: "jpg",
    jpeg: "jpeg",
    gif: "gif",
    webp: "webp",
    mp3: "mp3",
    mp4: "mp4",
    wav: "wav",
    m4a: "m4a",
  };
  return typeMap[extension] || "unknown";
}

/**
 * Process session notes into RAG
 */
async function processNotesToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  notes: string
) {
  console.log(`[Session RAG] Processing notes for session: ${sessionTitle}`);

  const source = await createSource({
    clientId,
    userId,
    type: "session_notes",
    name: `Session Notes: ${sessionTitle}`,
    metadata: { sessionId, contentType: "notes" },
    processingStatus: "processing",
  });

  const cleanNotes = sanitizeForDB(notes);
  const formattedContent = `# Session Notes: ${sessionTitle}\n\n${cleanNotes}`;

  await updateSourceContent(source.id, userId, formattedContent);
  await processSourceEmbeddings(source.id, clientId, userId, formattedContent, {
    type: "session_notes",
    sessionId,
    sessionTitle,
  });

  const { db } = await import("@/db");
  const { sources } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(sources).set({ processingStatus: "completed" }).where(eq(sources.id, source.id));
  console.log(`[Session RAG] Successfully indexed notes (source: ${source.id})`);

  return source.id;
}

/**
 * Extract and store comprehensive session insights
 */
async function processSessionInsights(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string
) {
  console.log(`[Session Insights] Extracting insights for: ${sessionTitle}`);

  try {
    const insights = await extractSessionInsights(transcript, {
      sessionTitle,
    });

    // Store insights on session record
    const { db } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    await db.update(sessions)
      .set({
        keyPoints: insights,
        summary: insights.summary,
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));

    // Create action items from extracted items
    if (insights.actionItems && insights.actionItems.length > 0) {
      await createDetectedActionItems(
        sessionId,
        clientId,
        userId,
        insights.actionItems.map((item) => ({
          title: item.title,
          description: item.description,
          owner: item.owner || (item.ownerType === "me" ? "me" : "client"),
          ownerType: item.ownerType,
          priority: item.priority,
        }))
      );
      console.log(`[Session Insights] Created ${insights.actionItems.length} action items`);
    }

    console.log(`[Session Insights] Stored insights: ${insights.nextSteps?.length || 0} next steps, ${insights.decisions?.length || 0} decisions`);
    return insights;
  } catch (error) {
    console.error("[Session Insights] Failed to extract insights:", error);
    return null;
  }
}
