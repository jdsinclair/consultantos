import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { models, systemPrompts, buildClientContext } from "@/lib/ai";
import { getClient } from "@/lib/db/clients";
import { getSources } from "@/lib/db/sources";
import { getSessions } from "@/lib/db/sessions";
import { getPersona } from "@/lib/db/personas";
import { searchRelevantChunks, buildContextFromChunks } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, clientId, personaId } = await req.json();

    // Get system prompt - from database persona or fallback to default
    let systemPrompt = systemPrompts.main;

    if (personaId) {
      try {
        const persona = await getPersona(personaId, userId);
        if (persona?.systemPrompt) {
          systemPrompt = persona.systemPrompt;
        }
      } catch (error) {
        console.error("Failed to fetch persona:", error);
        // Fall back to default
      }
    }

    // Build full system message with client context
    let fullSystemPrompt = systemPrompt;

    // If clientId provided, fetch context using RAG
    if (clientId) {
      try {
        const [client, sources, sessions] = await Promise.all([
          getClient(clientId, userId),
          getSources(clientId, userId),
          getSessions(userId, clientId),
        ]);

        if (client) {
          // Build basic client context (without source content)
          const clientContext = {
            name: client.name,
            company: client.company || undefined,
            description: client.description || undefined,
            sources: sources.map((s) => ({
              name: s.name,
              type: s.type,
              // Don't include full content - we'll use RAG for relevant chunks
            })),
            recentSessions: sessions.slice(0, 5).map((s) => ({
              title: s.title,
              summary: s.summary || undefined,
              date: s.createdAt,
            })),
          };

          fullSystemPrompt += "\n\n---\n\n" + buildClientContext(clientContext);

          // Get the last user message for RAG search
          const lastUserMessage = messages
            .slice()
            .reverse()
            .find((m: { role: string }) => m.role === "user");

          if (lastUserMessage?.content) {
            try {
              // Search for relevant chunks using vector similarity
              const relevantChunks = await searchRelevantChunks(
                lastUserMessage.content,
                clientId,
                userId,
                8, // Get top 8 relevant chunks
                0.5 // Lower threshold to get more results
              );

              if (relevantChunks.length > 0) {
                const contextFromChunks = buildContextFromChunks(relevantChunks);
                fullSystemPrompt += "\n\n" + contextFromChunks;
              }
            } catch (ragError) {
              console.error("RAG search failed:", ragError);
              // Fall back to basic context - don't fail the whole request
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch client context:", error);
      }
    }

    const result = await streamText({
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
