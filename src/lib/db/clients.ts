import { db } from "@/db";
import { clients, sources, sessions, actionItems, notes, contacts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { NewClient } from "@/db/schema";

export async function getClients(userId: string) {
  return db.query.clients.findMany({
    where: eq(clients.userId, userId),
    orderBy: [desc(clients.updatedAt)],
    with: {
      sources: true,
      sessions: {
        limit: 1,
        orderBy: [desc(sessions.createdAt)],
      },
    },
  });
}

export async function getClient(clientId: string, userId: string) {
  return db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, userId)),
    with: {
      sources: true,
      sessions: {
        orderBy: [desc(sessions.createdAt)],
        limit: 5,
      },
      actionItems: {
        where: eq(actionItems.status, "pending"),
        orderBy: [desc(actionItems.createdAt)],
      },
      notes: {
        orderBy: [desc(notes.isPinned), desc(notes.createdAt)],
        limit: 5,
      },
      contacts: true,
    },
  });
}

export async function createClient(data: NewClient) {
  const [client] = await db.insert(clients).values(data).returning();
  return client;
}

export async function updateClient(
  clientId: string,
  userId: string,
  data: Partial<NewClient>
) {
  const [client] = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
}

export async function deleteClient(clientId: string, userId: string) {
  await db
    .delete(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

export async function getClientStats(userId: string) {
  const result = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${clients.status} = 'active')`,
    })
    .from(clients)
    .where(eq(clients.userId, userId));

  return result[0];
}
