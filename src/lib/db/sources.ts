import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { NewSource } from "@/db/schema";

export async function getSources(clientId: string, userId: string) {
  return db.query.sources.findMany({
    where: and(eq(sources.clientId, clientId), eq(sources.userId, userId)),
    orderBy: [desc(sources.createdAt)],
  });
}

export async function getSource(sourceId: string, userId: string) {
  return db.query.sources.findFirst({
    where: and(eq(sources.id, sourceId), eq(sources.userId, userId)),
  });
}

export async function createSource(data: NewSource) {
  const [source] = await db.insert(sources).values(data).returning();
  return source;
}

export async function updateSource(
  sourceId: string,
  userId: string,
  data: Partial<NewSource>
) {
  const [source] = await db
    .update(sources)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .returning();
  return source;
}

export async function deleteSource(sourceId: string, userId: string) {
  await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
}

export async function updateSourceContent(
  sourceId: string,
  userId: string,
  content: string,
  chunks?: unknown[]
) {
  const [source] = await db
    .update(sources)
    .set({
      content,
      contentChunks: chunks,
      processingStatus: "completed",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .returning();
  return source;
}

export async function setSourceError(
  sourceId: string,
  userId: string,
  error: string
) {
  const [source] = await db
    .update(sources)
    .set({
      processingStatus: "failed",
      processingError: error,
      updatedAt: new Date(),
    })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .returning();
  return source;
}

export async function updateSourceSummary(
  sourceId: string,
  userId: string,
  aiSummary: {
    whatItIs: string;
    whyItMatters: string;
    keyInsights: string[];
    suggestedUses: string[];
    generatedAt: string;
    editedAt?: string;
    isEdited?: boolean;
  }
) {
  const [source] = await db
    .update(sources)
    .set({
      aiSummary,
      updatedAt: new Date(),
    })
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .returning();
  return source;
}

export async function getSourceWithChunks(sourceId: string, userId: string) {
  const source = await db.query.sources.findFirst({
    where: and(eq(sources.id, sourceId), eq(sources.userId, userId)),
    with: {
      chunks: {
        orderBy: (chunks, { asc }) => [asc(chunks.chunkIndex)],
      },
    },
  });
  return source;
}
