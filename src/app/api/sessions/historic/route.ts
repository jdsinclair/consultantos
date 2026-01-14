import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { createSession, updateSession } from "@/lib/db/sessions";
import { createSource, updateSourceContent } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractTodosFromTranscript } from "@/lib/ai/extract-todos";
import { createDetectedActionItems } from "@/lib/db/action-items";
import { z } from "zod";
import type { SessionAttachment } from "@/db/schema";
import pdf from "pdf-parse";

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

    // Process transcript for action items (async)
    if (data.transcript) {
      extractTodosFromTranscript(data.transcript)
        .then(async (todos) => {
          if (todos.length > 0) {
            await createDetectedActionItems(
              session.id,
              data.clientId,
              user.id,
              todos.map((todo) => ({
                title: todo.title,
                owner: todo.owner || (todo.ownerType === "me" ? "me" : "client"),
                ownerType: todo.ownerType,
                timestamp: todo.timestamp,
              }))
            );
            console.log(`Extracted ${todos.length} action items from historic session ${session.id}`);
          }
        })
        .catch((err) => {
          console.error("Failed to extract action items from historic session:", err);
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
      const sourceType = attachment.type === "recording" ? "recording" : "document";
      const fileType = getFileType(file.name);

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
      } else if (attachment.type === "whiteboard" || ["png", "jpg", "jpeg", "gif", "webp"].includes(fileType)) {
        // For images, store description as content for now
        // In a real app, you'd use vision AI to describe the image
        content = attachment.description || `[Whiteboard/Image: ${file.name}]`;
      } else {
        try {
          content = await file.text();
        } catch {
          content = `[${attachment.type}: ${file.name}]`;
        }
      }

      // Update source with content
      await updateSourceContent(source.id, userId, content);

      // Generate embeddings for RAG (if we have meaningful text)
      if (content && !content.startsWith("[")) {
        await processSourceEmbeddings(source.id, clientId, userId, content, {
          type: sourceType,
          fileType,
          fileName: file.name,
          sessionId,
        });
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
