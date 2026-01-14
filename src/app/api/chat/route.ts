import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { models, systemPrompts, buildClientContext } from "@/lib/ai";
import { getClient } from "@/lib/db/clients";
import { getSources } from "@/lib/db/sources";
import { getSessions } from "@/lib/db/sessions";
import { getPersona } from "@/lib/db/personas";
import { getClarityDocument } from "@/lib/db/clarity";
import { getClarityMethodCanvas } from "@/lib/db/clarity-method";
import { searchRelevantChunks, buildContextFromChunks } from "@/lib/rag";
import { buildCanvasContext } from "@/lib/clarity-method/rag-integration";

// Check API key availability at startup
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

export async function POST(req: Request) {
  try {
    // Pre-flight check: API key
    if (!hasAnthropicKey) {
      console.error("[Chat] ANTHROPIC_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "AI service not configured",
          details: "ANTHROPIC_API_KEY environment variable is missing"
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, clientId, personaId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
        const [client, sources, sessions, clarityDoc, clarityCanvas] = await Promise.all([
          getClient(clientId, userId),
          getSources(clientId, userId),
          getSessions(userId, clientId),
          getClarityDocument(clientId, userId),
          getClarityMethodCanvas(clientId, userId),
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

          // Add Clarity Document context if it exists
          if (clarityDoc) {
            let clarityContext = "\n\n## Clarity Document (Client's Business Definition)\n\n";

            if (clarityDoc.positioningStatement) {
              clarityContext += `**Positioning Statement:** ${clarityDoc.positioningStatement}\n\n`;
            }
            if (clarityDoc.niche) {
              clarityContext += `**Niche (Who they serve):** ${clarityDoc.niche}\n`;
            }
            if (clarityDoc.desiredOutcome) {
              clarityContext += `**Desired Outcome:** ${clarityDoc.desiredOutcome}\n`;
            }
            if (clarityDoc.offer) {
              clarityContext += `**Offer:** ${clarityDoc.offer}\n`;
            }
            if (clarityDoc.whoWeAre) {
              clarityContext += `\n**Who We Are:** ${clarityDoc.whoWeAre}\n`;
            }
            if (clarityDoc.whatWeDo) {
              clarityContext += `**What We Do:** ${clarityDoc.whatWeDo}\n`;
            }
            if (clarityDoc.howWeDoIt) {
              clarityContext += `**How We Do It:** ${clarityDoc.howWeDoIt}\n`;
            }
            if (clarityDoc.ourWedge) {
              clarityContext += `**Our Wedge (Differentiator):** ${clarityDoc.ourWedge}\n`;
            }
            if (clarityDoc.whyPeopleLoveUs) {
              clarityContext += `**Why People Love Us:** ${clarityDoc.whyPeopleLoveUs}\n`;
            }
            if (clarityDoc.howWeWillDie) {
              clarityContext += `**How We Will Die (Risks):** ${clarityDoc.howWeWillDie}\n`;
            }

            // Add locked-in sections
            if (clarityDoc.sections && Array.isArray(clarityDoc.sections) && clarityDoc.sections.length > 0) {
              clarityContext += "\n**Locked-In Insights:**\n";
              for (const section of clarityDoc.sections) {
                clarityContext += `- **${section.title}:** ${section.content}\n`;
              }
            }

            fullSystemPrompt += clarityContext;
          }

          // Add Clarity Method Canvas context if it exists
          if (clarityCanvas) {
            const canvasContext = buildCanvasContext(clarityCanvas);
            if (canvasContext) {
              fullSystemPrompt += "\n\n" + canvasContext;
            }
          }

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

    try {
      const result = await streamText({
        model: models.default,
        system: fullSystemPrompt,
        messages,
      });

      return result.toDataStreamResponse();
    } catch (streamError) {
      console.error("[Chat] Stream error:", streamError);

      // Check for specific API errors
      const errorMessage = streamError instanceof Error ? streamError.message : "Unknown error";

      if (errorMessage.includes("API key")) {
        return new Response(
          JSON.stringify({ error: "Invalid API key", details: errorMessage }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        return new Response(
          JSON.stringify({ error: "Rate limited", details: "Too many requests, please try again later" }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      if (errorMessage.includes("credit") || errorMessage.includes("billing")) {
        return new Response(
          JSON.stringify({ error: "Billing issue", details: "Check your AI provider account" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "AI request failed",
          details: errorMessage,
          type: streamError instanceof Error ? streamError.name : "Unknown"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[Chat] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
