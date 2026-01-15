import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getSession,
  updateSession,
  startSession,
  endSession,
  updateGameplan,
  appendTranscript,
  deleteSession,
} from "@/lib/db/sessions";
import { createDetectedActionItems } from "@/lib/db/action-items";
import { createSource, updateSourceContent } from "@/lib/db/sources";
import { processSourceEmbeddings } from "@/lib/rag";
import { extractSessionInsights } from "@/lib/ai/extract-todos";
import { z } from "zod";
import { db } from "@/db";
import { sources, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

/**
 * Sanitize content for PostgreSQL - removes null bytes and invalid UTF8
 */
function sanitizeForDB(content: string): string {
  if (!content) return "";
  return content.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/**
 * Check if a source already exists for this session by type
 */
async function sessionSourceExists(sessionId: string, userId: string, sourceType: string): Promise<boolean> {
  const allSources = await db.query.sources.findMany({
    where: and(
      eq(sources.userId, userId),
      eq(sources.type, sourceType)
    ),
  });
  return allSources.some(s => {
    const meta = s.metadata as { sessionId?: string } | null;
    return meta?.sessionId === sessionId;
  });
}

/**
 * Process session transcript into RAG
 * Returns early if a source already exists for this session (prevents duplicates)
 */
async function processTranscriptToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string
) {
  // Check if transcript source already exists for this session
  const alreadyExists = await sessionSourceExists(sessionId, userId, "session_transcript");
  if (alreadyExists) {
    console.log(`[Session RAG] Transcript source already exists for session: ${sessionTitle}, skipping`);
    return null;
  }

  console.log(`[Session RAG] Processing transcript for session: ${sessionTitle}`);

  const source = await createSource({
    clientId,
    userId,
    type: "session_transcript",
    name: `Session Transcript: ${sessionTitle}`,
    metadata: { sessionId, contentType: "transcript" },
    processingStatus: "processing",
  });

  const cleanTranscript = sanitizeForDB(transcript);
  const formattedContent = `# Session Transcript: ${sessionTitle}\n\n${cleanTranscript}`;

  await updateSourceContent(source.id, userId, formattedContent);
  await processSourceEmbeddings(source.id, clientId, userId, formattedContent, {
    type: "session_transcript",
    sessionId,
    sessionTitle,
  });

  await db.update(sources).set({ processingStatus: "completed" }).where(eq(sources.id, source.id));
  console.log(`[Session RAG] Successfully indexed transcript (source: ${source.id})`);

  return source.id;
}

/**
 * Process session notes into RAG
 * Returns early if a source already exists for this session (prevents duplicates)
 */
async function processNotesToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  notes: string
) {
  // Check if notes source already exists for this session
  const alreadyExists = await sessionSourceExists(sessionId, userId, "session_notes");
  if (alreadyExists) {
    console.log(`[Session RAG] Notes source already exists for session: ${sessionTitle}, skipping`);
    return null;
  }

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

  await db.update(sources).set({ processingStatus: "completed" }).where(eq(sources.id, source.id));
  console.log(`[Session RAG] Successfully indexed notes (source: ${source.id})`);

  return source.id;
}

/**
 * Extract and store session insights (decisions, next steps, key learnings)
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
          sourceContext: item.sourceContext,
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

const updateSessionSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  gameplan: z.array(z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
    order: z.number(),
  })).optional(),
  // Historic session editable fields
  transcript: z.string().optional(),
  notes: z.string().optional(),
  sessionDate: z.string().optional(), // ISO date string
  duration: z.number().optional(), // in minutes
  recordingUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const session = await getSession(params.id, user.id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateSessionSchema.parse(body);

    // Get existing session first
    const existingSession = await getSession(params.id, user.id);
    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Transform sessionDate/duration if provided
    const updateData: Record<string, unknown> = { ...data };
    if (data.sessionDate) {
      updateData.sessionDate = new Date(data.sessionDate);
      updateData.startedAt = new Date(data.sessionDate);
      if (data.duration) {
        updateData.endedAt = new Date(new Date(data.sessionDate).getTime() + data.duration * 60000);
        updateData.duration = data.duration * 60; // convert to seconds
      }
    }

    const session = await updateSession(params.id, user.id, updateData);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If transcript was updated and it's substantial, reprocess RAG
    if (data.transcript && data.transcript.trim().length > 100 && session.clientId) {
      const transcriptChanged = data.transcript !== existingSession.transcript;
      if (transcriptChanged) {
        // Process transcript to RAG in background
        processTranscriptToRAG(
          params.id,
          session.clientId,
          user.id,
          session.title,
          data.transcript
        ).catch((err) => console.error("Failed to reprocess transcript:", err));

        // Re-extract insights
        processSessionInsights(
          params.id,
          session.clientId,
          user.id,
          session.title,
          data.transcript
        ).catch((err) => console.error("Failed to reprocess insights:", err));
      }
    }

    // If notes were updated and it's substantial, reprocess RAG
    if (data.notes && data.notes.trim().length > 50 && session.clientId) {
      const notesChanged = data.notes !== existingSession.notes;
      if (notesChanged) {
        processNotesToRAG(
          params.id,
          session.clientId,
          user.id,
          session.title,
          data.notes
        ).catch((err) => console.error("Failed to reprocess notes:", err));
      }
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

// Start session
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();

    if (body.action === "start") {
      const session = await startSession(params.id, user.id);
      return NextResponse.json(session);
    }

    if (body.action === "end") {
      const session = await endSession(params.id, user.id);

      // Process session content in background (don't block response)
      if (session?.clientId) {
        // 1. Index transcript in RAG
        if (session.transcript && session.transcript.length > 100) {
          processTranscriptToRAG(
            params.id,
            session.clientId,
            user.id,
            session.title,
            session.transcript
          ).catch((err) => {
            console.error("Failed to process transcript to RAG:", err);
          });

          // 2. Extract comprehensive insights (action items, next steps, decisions)
          processSessionInsights(
            params.id,
            session.clientId,
            user.id,
            session.title,
            session.transcript
          ).catch((err) => {
            console.error("Failed to extract session insights:", err);
          });
        }

        // 3. Index notes in RAG
        if (session.notes && session.notes.length > 50) {
          processNotesToRAG(
            params.id,
            session.clientId,
            user.id,
            session.title,
            session.notes
          ).catch((err) => {
            console.error("Failed to process notes to RAG:", err);
          });
        }
      }

      return NextResponse.json(session);
    }

    if (body.action === "transcript" && body.text) {
      const session = await appendTranscript(params.id, user.id, body.text);
      return NextResponse.json(session);
    }

    if (body.action === "gameplan" && body.gameplan) {
      const session = await updateGameplan(params.id, user.id, body.gameplan);
      return NextResponse.json(session);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const deleted = await deleteSession(params.id, user.id);

    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
