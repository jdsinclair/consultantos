import { generateObject } from "ai";
import { z } from "zod";
import { models, systemPrompts } from "@/lib/ai";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(["talking_point", "commitment", "drift_warning", "insight"]),
      content: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      context: z.string().optional(),
    })
  ),
  detectedCommitments: z.array(
    z.object({
      text: z.string(),
      owner: z.enum(["consultant", "client"]),
      dueDate: z.string().optional(),
    })
  ),
});

// Generate new suggestions from AI
export async function POST(req: Request) {
  const { transcript, gameplan, clientContext } = await req.json();

  const prompt = `Analyze this live session transcript and provide suggestions.

GAMEPLAN:
${gameplan?.map((item: { text: string; done: boolean }, i: number) => `${i + 1}. [${item.done ? "x" : " "}] ${item.text}`).join("\n")}

RECENT TRANSCRIPT:
${transcript}

CLIENT CONTEXT:
${clientContext || "No additional context"}

Provide:
1. Relevant talking points based on the gameplan and conversation flow
2. Flag any commitments made (by either party)
3. Warn if conversation is drifting from the gameplan
4. Surface any relevant insights from client context`;

  const result = await generateObject({
    model: models.fast,
    system: systemPrompts.liveSession,
    prompt,
    schema: suggestionSchema,
  });

  return Response.json(result.object);
}

// Save suggestions to database
export async function PUT(req: Request) {
  try {
    await requireUser();
    const { sessionId, suggestions: suggestionList } = await req.json();

    if (!sessionId || !suggestionList || !Array.isArray(suggestionList)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    // Insert all suggestions
    const values = suggestionList.map((s: {
      type: string;
      content: string;
      priority?: string;
      context?: string;
      acted?: boolean;
      dismissed?: boolean;
    }) => ({
      sessionId,
      type: s.type,
      content: s.content,
      priority: s.priority || "medium",
      context: s.context,
      acted: s.acted || false,
      dismissed: s.dismissed || false,
    }));

    if (values.length > 0) {
      await db.insert(suggestions).values(values);
    }

    return Response.json({ success: true, count: values.length });
  } catch (error) {
    console.error("Failed to save suggestions:", error);
    return Response.json({ error: "Failed to save suggestions" }, { status: 500 });
  }
}

// Update a suggestion (mark as acted or dismissed)
export async function PATCH(req: Request) {
  try {
    await requireUser();
    const { suggestionId, acted, dismissed } = await req.json();

    if (!suggestionId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const updateData: { acted?: boolean; dismissed?: boolean } = {};
    if (acted !== undefined) updateData.acted = acted;
    if (dismissed !== undefined) updateData.dismissed = dismissed;

    const [updated] = await db
      .update(suggestions)
      .set(updateData)
      .where(eq(suggestions.id, suggestionId))
      .returning();

    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update suggestion:", error);
    return Response.json({ error: "Failed to update suggestion" }, { status: 500 });
  }
}
