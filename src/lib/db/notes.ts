import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type NewNote = {
  userId: string;
  clientId: string;
  sessionId?: string;
  title?: string;
  content: string;
  isPinned?: boolean;
  noteType?: string;
  labels?: string[];
};

export async function getNotes(
  userId: string,
  options?: {
    clientId?: string;
    sessionId?: string;
    noteType?: string;
    limit?: number;
  }
) {
  const conditions = [eq(notes.userId, userId)];

  if (options?.clientId) {
    conditions.push(eq(notes.clientId, options.clientId));
  }
  if (options?.sessionId) {
    conditions.push(eq(notes.sessionId, options.sessionId));
  }
  if (options?.noteType) {
    conditions.push(eq(notes.noteType, options.noteType));
  }

  return db.query.notes.findMany({
    where: and(...conditions),
    orderBy: [desc(notes.isPinned), desc(notes.createdAt)],
    limit: options?.limit,
    with: {
      client: true,
      session: true,
    },
  });
}

export async function getNote(noteId: string, userId: string) {
  return db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
    with: {
      client: true,
      session: true,
    },
  });
}

export async function createNote(data: NewNote) {
  const [note] = await db.insert(notes).values(data).returning();
  return note;
}

export async function updateNote(
  noteId: string,
  userId: string,
  data: Partial<Omit<NewNote, "userId">>
) {
  const [note] = await db
    .update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning();
  return note;
}

export async function deleteNote(noteId: string, userId: string) {
  await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

export async function togglePinNote(noteId: string, userId: string) {
  const note = await getNote(noteId, userId);
  if (!note) return null;

  return updateNote(noteId, userId, { isPinned: !note.isPinned });
}
