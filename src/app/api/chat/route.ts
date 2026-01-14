import { streamText } from "ai";
import { models, systemPrompts, buildClientContext } from "@/lib/ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages, clientContext, persona = "main" } = await req.json();

  // Select system prompt based on persona
  const systemPrompt = systemPrompts[persona as keyof typeof systemPrompts] || systemPrompts.main;

  // Build full system message with client context
  let fullSystemPrompt = systemPrompt;
  if (clientContext) {
    fullSystemPrompt += "\n\n---\n\n" + buildClientContext(clientContext);
  }

  const result = streamText({
    model: models.default,
    system: fullSystemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
