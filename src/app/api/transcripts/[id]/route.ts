import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { transcriptUploads, sessions, sources, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createSession, updateSession } from "@/lib/db/sessions";
import { createSource, updateSourceContent, updateSourceSummary, setSourceError } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractSessionInsights } from "@/lib/ai/extract-todos";
import { createDetectedActionItems } from "@/lib/db/action-items";
import { generateSourceSummary } from "@/lib/ai/source-summary";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

/**
 * Sanitize content for PostgreSQL - removes null bytes and invalid UTF8
 */
function sanitizeForDB(content: string): string {
  if (!content) return "";
  return content.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

const updateTranscriptSchema = z.object({
  title: z.string().min(1).optional(),
  clientId: z.string().uuid().nullable().optional(),
  sessionDate: z.string().datetime().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(["inbox", "assigned", "archived"]).optional(),
});

const assignToSessionSchema = z.object({
  action: z.literal("assign_to_session"),
  clientId: z.string().uuid(),
  title: z.string().min(1).optional(),
  sessionDate: z.string().datetime().optional(),
  duration: z.number().optional(), // in minutes
});

// GET single transcript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transcript = await db.query.transcriptUploads.findFirst({
      where: and(
        eq(transcriptUploads.id, params.id),
        eq(transcriptUploads.userId, userId)
      ),
      with: {
        client: true,
        session: true,
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    return NextResponse.json(transcript);
  } catch (error) {
    console.error("Failed to get transcript:", error);
    return NextResponse.json({ error: "Failed to get transcript" }, { status: 500 });
  }
}

// PATCH - update transcript metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateTranscriptSchema.parse(body);

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.sessionDate) {
      updateData.sessionDate = new Date(data.sessionDate);
    }

    const [transcript] = await db
      .update(transcriptUploads)
      .set(updateData)
      .where(
        and(eq(transcriptUploads.id, params.id), eq(transcriptUploads.userId, userId))
      )
      .returning();

    if (!transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    return NextResponse.json(transcript);
  } catch (error) {
    console.error("Failed to update transcript:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update transcript" }, { status: 500 });
  }
}

// POST - process transcript action (assign_to_session)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Get the transcript
    const transcript = await db.query.transcriptUploads.findFirst({
      where: and(
        eq(transcriptUploads.id, params.id),
        eq(transcriptUploads.userId, userId)
      ),
    });

    if (!transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    if (body.action === "assign_to_session") {
      const data = assignToSessionSchema.parse(body);

      // Get client name for AI context
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, data.clientId),
      });
      const clientName = client?.name;

      const sessionTitle = data.title || transcript.title || "Imported Session";
      const sessionDate = data.sessionDate
        ? new Date(data.sessionDate)
        : transcript.sessionDate || new Date();
      const duration = data.duration || transcript.duration;

      // Create historic session
      const session = await createSession({
        userId,
        clientId: data.clientId,
        title: sessionTitle,
        status: "completed",
        isHistoric: true,
        sessionDate,
        startedAt: sessionDate,
        endedAt: duration
          ? new Date(sessionDate.getTime() + duration * 60000)
          : sessionDate,
        duration: duration ? duration * 60 : undefined, // convert to seconds
        transcript: transcript.content,
        notes: transcript.notes || undefined,
      });

      // Update transcript upload record
      await db
        .update(transcriptUploads)
        .set({
          clientId: data.clientId,
          sessionId: session.id,
          status: "assigned",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transcriptUploads.id, params.id));

      // Process transcript to RAG in background
      processTranscriptToRAG(
        session.id,
        data.clientId,
        userId,
        sessionTitle,
        transcript.content,
        clientName
      ).catch((err) => {
        console.error("Failed to process transcript to RAG:", err);
      });

      // Extract insights in background
      processSessionInsights(
        session.id,
        data.clientId,
        userId,
        sessionTitle,
        transcript.content
      ).catch((err) => {
        console.error("Failed to extract session insights:", err);
      });

      // If there are notes, process those too
      if (transcript.notes && transcript.notes.length > 50) {
        processNotesToRAG(
          session.id,
          data.clientId,
          userId,
          sessionTitle,
          transcript.notes,
          clientName
        ).catch((err) => {
          console.error("Failed to process notes to RAG:", err);
        });
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        message: "Transcript assigned to session and processing started",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Transcript action error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process transcript" }, { status: 500 });
  }
}

// DELETE transcript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [deleted] = await db
      .delete(transcriptUploads)
      .where(
        and(eq(transcriptUploads.id, params.id), eq(transcriptUploads.userId, userId))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete transcript:", error);
    return NextResponse.json({ error: "Failed to delete transcript" }, { status: 500 });
  }
}

/**
 * Process session transcript into RAG
 */
async function processTranscriptToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string,
  clientName?: string
) {
  console.log(`[Transcript RAG] Processing transcript for session: ${sessionTitle}`);

  const source = await createSource({
    clientId,
    userId,
    type: "session_transcript",
    name: `Session Transcript: ${sessionTitle}`,
    metadata: { sessionId, contentType: "transcript" },
    processingStatus: "processing",
  });

  try {
    const cleanTranscript = sanitizeForDB(transcript);
    const formattedContent = `# Session Transcript: ${sessionTitle}\n\n${cleanTranscript}`;

    await updateSourceContent(source.id, userId, formattedContent);

    // Generate AI summary
    console.log(`[Transcript RAG] Generating AI summary for: ${sessionTitle}`);
    try {
      const summary = await generateSourceSummary(formattedContent, {
        fileName: `${sessionTitle} - Transcript`,
        fileType: "transcript",
        clientName,
        sourceType: "session_transcript",
      });
      await updateSourceSummary(source.id, userId, summary);
    } catch (summaryError) {
      console.error(`[Transcript RAG] Failed to generate AI summary:`, summaryError);
    }

    // Generate embeddings
    console.log(`[Transcript RAG] Generating embeddings for: ${sessionTitle}`);
    await processSourceEmbeddings(source.id, clientId, userId, false, formattedContent, {
      type: "session_transcript",
      sessionId,
      sessionTitle,
    });

    await db
      .update(sources)
      .set({ processingStatus: "completed" })
      .where(eq(sources.id, source.id));

    console.log(`[Transcript RAG] Successfully indexed transcript (source: ${source.id})`);
  } catch (error) {
    console.error(`[Transcript RAG] Failed to process transcript:`, error);
    await setSourceError(source.id, userId, String(error));
    throw error;
  }
}

/**
 * Process session notes into RAG
 */
async function processNotesToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  notes: string,
  clientName?: string
) {
  console.log(`[Transcript RAG] Processing notes for session: ${sessionTitle}`);

  const source = await createSource({
    clientId,
    userId,
    type: "session_notes",
    name: `Session Notes: ${sessionTitle}`,
    metadata: { sessionId, contentType: "notes" },
    processingStatus: "processing",
  });

  try {
    const cleanNotes = sanitizeForDB(notes);
    const formattedContent = `# Session Notes: ${sessionTitle}\n\n${cleanNotes}`;

    await updateSourceContent(source.id, userId, formattedContent);

    // Generate AI summary
    try {
      const summary = await generateSourceSummary(formattedContent, {
        fileName: `${sessionTitle} - Notes`,
        fileType: "notes",
        clientName,
        sourceType: "session_notes",
      });
      await updateSourceSummary(source.id, userId, summary);
    } catch (summaryError) {
      console.error(`[Transcript RAG] Failed to generate AI summary for notes:`, summaryError);
    }

    await processSourceEmbeddings(source.id, clientId, userId, false, formattedContent, {
      type: "session_notes",
      sessionId,
      sessionTitle,
    });

    await db
      .update(sources)
      .set({ processingStatus: "completed" })
      .where(eq(sources.id, source.id));

    console.log(`[Transcript RAG] Successfully indexed notes (source: ${source.id})`);
  } catch (error) {
    console.error(`[Transcript RAG] Failed to process notes:`, error);
    await setSourceError(source.id, userId, String(error));
    throw error;
  }
}

/**
 * Extract and store session insights
 */
async function processSessionInsights(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string
) {
  console.log(`[Transcript Insights] Extracting insights for: ${sessionTitle}`);

  try {
    const insights = await extractSessionInsights(transcript, {
      sessionTitle,
    });

    // Store insights on session record
    await db
      .update(sessions)
      .set({
        keyPoints: insights,
        summary: insights.summary,
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));

    // Create action items
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
      console.log(`[Transcript Insights] Created ${insights.actionItems.length} action items`);
    }

    return insights;
  } catch (error) {
    console.error("[Transcript Insights] Failed to extract insights:", error);
    return null;
  }
}
