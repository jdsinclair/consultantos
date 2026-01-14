import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { models, systemPrompts, buildClientContext } from "@/lib/ai";
import { getClient } from "@/lib/db/clients";
import { getSources } from "@/lib/db/sources";
import { getSessions } from "@/lib/db/sessions";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, clientId, sessionId, persona = "main" } = await req.json();

    // Select system prompt based on persona
    const systemPrompt =
      systemPrompts[persona as keyof typeof systemPrompts] || systemPrompts.main;

    // Build full system message with client context
    let fullSystemPrompt = systemPrompt;

    // If clientId provided, fetch real client data
    if (clientId) {
      try {
        const [client, sources, sessions] = await Promise.all([
          getClient(clientId, userId),
          getSources(clientId, userId),
          getSessions(userId, clientId),
        ]);

        if (client) {
          const clientContext = {
            name: client.name,
            company: client.company || undefined,
            description: client.description || undefined,
            sources: sources.map((s) => ({
              name: s.name,
              type: s.type,
              content: s.content?.slice(0, 2000), // Limit content size
            })),
            recentSessions: sessions.slice(0, 5).map((s) => ({
              title: s.title,
              summary: s.summary || undefined,
              date: s.createdAt,
            })),
          };

          fullSystemPrompt +=
            "\n\n---\n\n" + buildClientContext(clientContext);
        }
      } catch (error) {
        console.error("Failed to fetch client context:", error);
      }
    }

    const result = streamText({
      model: models.default,
      system: fullSystemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
