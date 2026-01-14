import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getNotes, createNote } from "@/lib/db/notes";
import { extractTodosFromText } from "@/lib/ai/extract-todos";
import { createActionItem } from "@/lib/db/action-items";
import { z } from "zod";

const createNoteSchema = z.object({
  clientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  title: z.string().optional(),
  content: z.string().min(1),
  isPinned: z.boolean().optional(),
  extractTodos: z.boolean().optional(), // If true, AI will extract TODOs from content
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    const notes = await getNotes(user.id, {
      clientId: clientId || undefined,
      sessionId: sessionId || undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createNoteSchema.parse(body);

    // Create the note
    const note = await createNote({
      userId: user.id,
      clientId: data.clientId,
      sessionId: data.sessionId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
    });

    // Optionally extract TODOs from the note content
    let extractedTodos: Awaited<ReturnType<typeof createActionItem>>[] = [];
    if (data.extractTodos) {
      const todos = await extractTodosFromText(data.content, { isNote: true });

      // Create action items for each extracted TODO
      extractedTodos = await Promise.all(
        todos.map((todo) =>
          createActionItem({
            userId: user.id,
            clientId: data.clientId,
            noteId: note.id,
            title: todo.title,
            description: todo.description,
            owner: todo.owner,
            ownerType: todo.ownerType,
            priority: todo.priority,
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
            source: "note",
            sourceContext: todo.sourceContext,
          })
        )
      );
    }

    return NextResponse.json(
      {
        note,
        extractedTodos: extractedTodos.length > 0 ? extractedTodos : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
