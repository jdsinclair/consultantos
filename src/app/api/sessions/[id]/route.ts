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
import { extractTodosFromTranscript } from "@/lib/ai/extract-todos";
import { z } from "zod";

/**
 * Sanitize content for PostgreSQL - removes null bytes and invalid UTF8
 */
function sanitizeForDB(content: string): string {
  if (!content) return "";
  return content.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/**
 * Process session transcript into RAG
 */
async function processTranscriptToRAG(
  sessionId: string,
  clientId: string,
  userId: string,
  sessionTitle: string,
  transcript: string
) {
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

  const { db } = await import("@/db");
  const { sources } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(sources).set({ processingStatus: "completed" }).where(eq(sources.id, source.id));
  console.log(`[Session RAG] Successfully indexed transcript (source: ${source.id})`);
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

    const session = await updateSession(params.id, user.id, data);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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

      // Process transcript in background (don't block response)
      if (session?.transcript && session.transcript.length > 100 && session.clientId) {
        // 1. Index transcript in RAG for searchability
        processTranscriptToRAG(
          params.id,
          session.clientId,
          user.id,
          session.title,
          session.transcript
        ).catch((err) => {
          console.error("Failed to process transcript to RAG:", err);
        });

        // 2. Extract action items from transcript
        extractTodosFromTranscript(session.transcript)
          .then(async (todos) => {
            if (todos.length > 0) {
              await createDetectedActionItems(
                params.id,
                session.clientId!,
                user.id,
                todos.map((todo) => ({
                  title: todo.title,
                  owner: todo.owner || (todo.ownerType === "me" ? "me" : "client"),
                  ownerType: todo.ownerType,
                  timestamp: todo.timestamp,
                }))
              );
              console.log(
                `Extracted ${todos.length} action items from session ${params.id}`
              );
            }
          })
          .catch((err) => {
            console.error("Failed to extract action items:", err);
          });
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
