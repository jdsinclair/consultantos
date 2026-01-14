import { db } from "@/db";
import { actionItems } from "@/db/schema";
import { eq, and, desc, ne, or, isNull, lte } from "drizzle-orm";
import type { NewActionItem } from "@/db/schema";

export async function getActionItems(
  userId: string,
  options?: {
    clientId?: string;
    status?: string;
    limit?: number;
  }
) {
  const conditions = [eq(actionItems.userId, userId)];

  if (options?.clientId) {
    conditions.push(eq(actionItems.clientId, options.clientId));
  }
  if (options?.status) {
    conditions.push(eq(actionItems.status, options.status));
  } else {
    // By default, exclude completed and cancelled
    conditions.push(
      and(
        ne(actionItems.status, "completed"),
        ne(actionItems.status, "cancelled")
      )!
    );
  }

  return db.query.actionItems.findMany({
    where: and(...conditions),
    orderBy: [desc(actionItems.priority), actionItems.dueDate],
    limit: options?.limit,
    with: {
      client: true,
      session: true,
    },
  });
}

export async function getOverdueActionItems(userId: string) {
  const now = new Date();
  return db.query.actionItems.findMany({
    where: and(
      eq(actionItems.userId, userId),
      eq(actionItems.status, "pending"),
      lte(actionItems.dueDate, now)
    ),
    orderBy: [actionItems.dueDate],
    with: {
      client: true,
    },
  });
}

export async function createActionItem(data: NewActionItem) {
  const [item] = await db.insert(actionItems).values(data).returning();
  return item;
}

export async function updateActionItem(
  itemId: string,
  userId: string,
  data: Partial<NewActionItem>
) {
  const [item] = await db
    .update(actionItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(actionItems.id, itemId), eq(actionItems.userId, userId)))
    .returning();
  return item;
}

export async function completeActionItem(itemId: string, userId: string) {
  return updateActionItem(itemId, userId, {
    status: "completed",
    completedAt: new Date(),
  });
}

export async function deleteActionItem(itemId: string, userId: string) {
  await db
    .delete(actionItems)
    .where(and(eq(actionItems.id, itemId), eq(actionItems.userId, userId)));
}

// Create action items detected from AI during sessions
export async function createDetectedActionItems(
  sessionId: string,
  clientId: string,
  userId: string,
  items: Array<{
    title: string;
    owner: string;
    ownerType: "me" | "client";
    timestamp?: string;
  }>
) {
  if (items.length === 0) return [];

  const values = items.map((item) => ({
    userId,
    sessionId,
    clientId,
    title: item.title,
    owner: item.owner,
    ownerType: item.ownerType,
    source: "detected" as const,
    transcriptTimestamp: item.timestamp,
  }));

  return db.insert(actionItems).values(values).returning();
}
