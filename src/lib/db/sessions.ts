import { db } from "@/db";
import { sessions, suggestions, actionItems } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type { NewSession, GameplanItem } from "@/db/schema";

export async function getSessions(userId: string, clientId?: string) {
  const conditions = [eq(sessions.userId, userId)];
  if (clientId) {
    conditions.push(eq(sessions.clientId, clientId));
  }

  return db.query.sessions.findMany({
    where: and(...conditions),
    orderBy: [desc(sessions.createdAt)],
    with: {
      client: true,
      method: true,
    },
  });
}

export async function getSession(sessionId: string, userId: string) {
  return db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
    with: {
      client: true,
      method: true,
      actionItems: true,
      suggestions: {
        orderBy: [desc(suggestions.createdAt)],
      },
    },
  });
}

export async function createSession(data: NewSession) {
  const [session] = await db.insert(sessions).values(data).returning();
  return session;
}

export async function updateSession(
  sessionId: string,
  userId: string,
  data: Partial<NewSession>
) {
  const [session] = await db
    .update(sessions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning();
  return session;
}

export async function startSession(sessionId: string, userId: string) {
  return updateSession(sessionId, userId, {
    status: "live",
    startedAt: new Date(),
  });
}

export async function endSession(sessionId: string, userId: string) {
  const session = await getSession(sessionId, userId);
  if (!session) throw new Error("Session not found");

  const duration = session.startedAt
    ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
    : 0;

  return updateSession(sessionId, userId, {
    status: "completed",
    endedAt: new Date(),
    duration,
  });
}

export async function updateGameplan(
  sessionId: string,
  userId: string,
  gameplan: GameplanItem[]
) {
  return updateSession(sessionId, userId, { gameplan });
}

export async function appendTranscript(
  sessionId: string,
  userId: string,
  text: string
) {
  const session = await getSession(sessionId, userId);
  if (!session) throw new Error("Session not found");

  const newTranscript = session.transcript
    ? session.transcript + "\n" + text
    : text;

  return updateSession(sessionId, userId, { transcript: newTranscript });
}

export async function getUpcomingSessions(userId: string) {
  const now = new Date();
  return db.query.sessions.findMany({
    where: and(
      eq(sessions.userId, userId),
      eq(sessions.status, "scheduled"),
      gte(sessions.scheduledAt, now)
    ),
    orderBy: [sessions.scheduledAt],
    limit: 5,
    with: {
      client: true,
    },
  });
}

export async function getLiveSession(userId: string) {
  return db.query.sessions.findFirst({
    where: and(eq(sessions.userId, userId), eq(sessions.status, "live")),
    with: {
      client: true,
      method: true,
      suggestions: {
        where: eq(suggestions.dismissed, false),
        orderBy: [desc(suggestions.createdAt)],
      },
    },
  });
}
