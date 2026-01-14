import { db } from "@/db";
import { clients, sources, sessions, actionItems, notes, contacts, clarityDocuments } from "@/db/schema";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";
import type { NewClient, ProspectEvaluation } from "@/db/schema";

export async function getClients(userId: string, status?: string) {
  return db.query.clients.findMany({
    where: status
      ? and(eq(clients.userId, userId), eq(clients.status, status))
      : eq(clients.userId, userId),
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

// Get prospects only
export async function getProspects(userId: string) {
  return db.query.clients.findMany({
    where: and(eq(clients.userId, userId), eq(clients.status, "prospect")),
    orderBy: [desc(clients.createdAt)],
  });
}

// Search clients/prospects by name, company, or website
export async function searchClients(userId: string, query: string) {
  const searchPattern = `%${query}%`;
  return db.query.clients.findMany({
    where: and(
      eq(clients.userId, userId),
      or(
        ilike(clients.name, searchPattern),
        ilike(clients.company, searchPattern),
        ilike(clients.website, searchPattern)
      )
    ),
    orderBy: [desc(clients.updatedAt)],
    limit: 10,
  });
}

// Update evaluation for a prospect
export async function updateProspectEvaluation(
  clientId: string,
  userId: string,
  evaluation: ProspectEvaluation
) {
  const [client] = await db
    .update(clients)
    .set({
      evaluation,
      evaluatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
}

// Convert prospect to active client
export async function convertProspectToClient(clientId: string, userId: string) {
  const [client] = await db
    .update(clients)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
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
