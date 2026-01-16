import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getClientMessages,
  saveMessage,
  getOrCreateProspectEvalConversation,
  clearConversation,
} from "@/lib/db/messages";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// GET - Fetch all messages for this prospect's eval
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const messages = await getClientMessages(params.id, user.id);

    // Convert to format expected by useChat
    const formattedMessages = messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const saveMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

// POST - Save a new message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = saveMessageSchema.parse(body);

    // Get or create conversation ID
    const conversationId = await getOrCreateProspectEvalConversation(
      params.id,
      user.id
    );

    const message = await saveMessage({
      userId: user.id,
      clientId: params.id,
      conversationId,
      role: data.role,
      content: data.content,
    });

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to save message:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

// DELETE - Clear conversation (start fresh)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const conversationId = await getOrCreateProspectEvalConversation(
      params.id,
      user.id
    );

    await clearConversation(conversationId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear conversation:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
