import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getNote, updateNote, deleteNote, togglePinNote } from "@/lib/db/notes";
import { z } from "zod";

const NOTE_TYPES = ["general", "future", "competitor", "partner", "idea", "reference"] as const;

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  noteType: z.enum(NOTE_TYPES).optional(),
  labels: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const note = await getNote(id, user.id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    // Handle toggle pin action
    if (body.action === "togglePin") {
      const note = await togglePinNote(id, user.id);
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      return NextResponse.json(note);
    }

    const data = updateNoteSchema.parse(body);
    const note = await updateNote(id, user.id, data);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    await deleteNote(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
