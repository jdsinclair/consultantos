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

// Create prospect from webhook (Zapier, etc.)
export async function createProspectFromWebhook(data: {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}) {
  const name = `${data.firstName} ${data.lastName}`.trim();

  const [prospect] = await db
    .insert(clients)
    .values({
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      name,
      email: data.email,
      phone: data.phone,
      status: "prospect",
      dealValue: 500000, // $5,000 default in cents
      dealStatus: "none", // No quote
      sourceType: "webhook",
      // viewedAt is null by default = "new"
    })
    .returning();

  return prospect;
}

// Mark client/prospect as viewed (clears "new" badge)
export async function markClientViewed(clientId: string, userId: string) {
  const [client] = await db
    .update(clients)
    .set({
      viewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
}

// Get all clients grouped by status for CRM view
export async function getClientsForCRM(userId: string) {
  return db.query.clients.findMany({
    where: eq(clients.userId, userId),
    orderBy: [desc(clients.updatedAt)],
    columns: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      company: true,
      email: true,
      status: true,
      dealValue: true,
      dealStatus: true,
      viewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Update client status (for CRM drag-and-drop)
export async function updateClientStatus(
  clientId: string,
  userId: string,
  status: string
) {
  const [client] = await db
    .update(clients)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
}

// Update client deal value
export async function updateClientDealValue(
  clientId: string,
  userId: string,
  dealValue: number
) {
  const [client] = await db
    .update(clients)
    .set({ dealValue, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();
  return client;
}
