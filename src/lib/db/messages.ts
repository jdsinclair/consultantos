import { db } from "@/db";
import { messages, clients } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Get or create a conversation ID for prospect eval
export async function getOrCreateProspectEvalConversation(
  clientId: string,
  userId: string
): Promise<string> {
  // Check if there's an existing conversation for this prospect's eval
  const existingMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.clientId, clientId),
      eq(messages.userId, userId)
    ),
    orderBy: [desc(messages.createdAt)],
  });

  if (existingMessage?.conversationId) {
    return existingMessage.conversationId;
  }

  // Create a new conversation ID
  return uuidv4();
}

// Get all messages for a conversation
export async function getConversationMessages(
  conversationId: string,
  userId: string
) {
  return db.query.messages.findMany({
    where: and(
      eq(messages.conversationId, conversationId),
      eq(messages.userId, userId)
    ),
    orderBy: [asc(messages.createdAt)],
  });
}

// Get messages for a client (prospect eval)
export async function getClientMessages(
  clientId: string,
  userId: string
) {
  return db.query.messages.findMany({
    where: and(
      eq(messages.clientId, clientId),
      eq(messages.userId, userId)
    ),
    orderBy: [asc(messages.createdAt)],
  });
}

// Save a message
export async function saveMessage(data: {
  userId: string;
  clientId?: string;
  conversationId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const [message] = await db
    .insert(messages)
    .values({
      userId: data.userId,
      clientId: data.clientId,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata,
    })
    .returning();
  return message;
}

// Save multiple messages (for bulk import)
export async function saveMessages(
  messageList: Array<{
    userId: string;
    clientId?: string;
    conversationId?: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, unknown>;
  }>
) {
  if (messageList.length === 0) return [];

  const result = await db
    .insert(messages)
    .values(messageList)
    .returning();
  return result;
}

// Clear conversation (for starting fresh)
export async function clearConversation(
  conversationId: string,
  userId: string
) {
  await db
    .delete(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.userId, userId)
      )
    );
}
