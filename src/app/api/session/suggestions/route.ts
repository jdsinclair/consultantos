import { generateObject } from "ai";
import { z } from "zod";
import { models, systemPrompts } from "@/lib/ai";

export const runtime = "edge";

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
