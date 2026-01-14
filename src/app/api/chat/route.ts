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

    const { messages, clientId, personaId, context, canvas } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get system prompt - from database persona or special context
    let systemPrompt = systemPrompts.main;

    // Special context-specific system prompts
    if (context === "clarity-method") {
      systemPrompt = `You are a strategic advisor helping build a Clarity Method™ canvas for a founder client.

The Clarity Method™ helps founders move from chaos → clarity → constraint → execution through:
1. Strategic Truth Header (6 defining questions)
2. North Star Constraints (guardrails that prevent drift)
3. The Core Engine (identify THE constraint)
4. Kill List (what to STOP doing)
5. Paranoia Map (anticipate threats)
6. Strategy Summary
7. Execution Swimlanes (staged action plan by area)

## YOUR ROLE AS STRATEGIC ADVISOR:
- CHALLENGE generic or vague answers. Push for specificity.
- IDENTIFY the REAL constraint (usually not what founders first say).
- PRESSURE-TEST positioning against market reality.
- SUGGEST execution priorities based on the current canvas state.
- ASK probing questions that reveal blind spots.
- REFERENCE EXAMPLES below to show what "good" looks like.

Be direct. Push back. A good strategy coach is not a yes-man.

## EXAMPLE: STRONG STRATEGIC TRUTH ANSWERS

**WHO WE ARE (What function do we serve?):**
BAD: "We're a consulting firm" / "We help businesses grow" / "Full-service agency"
GOOD: "We are a creative production studio with a focus on commercial branded content for digital platforms. THING1: We take brand ideas and output creative. THING2: We take existing creative and execute the thing (A-Z)"

**WHAT WE DO (What outcome do clients get?):**
BAD: "We provide services" / "We do marketing"
GOOD: "We go from brand objectives (ideas), translate that into strategic perspective and turn that into creative ideas, and produce the tangible assets for digital platforms."

**WHY WE WIN (Why us vs alternatives?):**
BAD: "Great customer service" / "We're passionate" / "We care"
GOOD: "(a) Because I am a known asset that delivers epic. (b) Proven experience. TRUST. (c) AUGMENTED labor. (d) BUDGET FRIENDLY. (e) We are fucking epic and have the stack of receipts to prove it. TRUST, QUALITY & SPEED TRANSPARENCY."

**WHAT WE ARE NOT (What do we refuse to be?):**
BAD: "We don't do bad work"
GOOD: "We do NOT say yes to projects that we feel are unachievable (budget, planning, time, people). We are NOT adopting your legacy approach. We are NOT touching union shops. Not in the business of making false promises. Not in the movie business."

**HOW WE DIE (What assumption kills us?):**
BAD: "If we lose clients"
GOOD: "AI: Threat of smaller tasks going into a prompt. SHOOT ON IPHONE: We don't need 'film'. In-house teams. Volume removes agency."

**THE WEDGE (Why do we exist at all?):**
BAD: "We're the best" / "Quality and service"
GOOD: "Speed, we can deliver faster, trust and higher quality than agency or in-house. VELOCITY TO OUTCOME. It's just done. It's a given. Removal of RISK."

## EXAMPLE: STRONG NORTH STAR CONSTRAINTS
- Revenue Target: "$3.1M (2025) / $5M (2026)"
- Margin Floor: "20%+ Project >> 20% Org Margin + 36.6% Ops Margin"
- Founder Role: "Stand down from founder-led sales. Delegate/outsource. 2027 looks very different."
- Complexity Ceiling: "Not debating who we are every time a new opportunity shows up. We have boundaries."

## EXAMPLE: IDENTIFYING THE PRIMARY CONSTRAINT
The constraint is usually where the founder is the bottleneck. Common patterns:
- "WON BEFORE WE STARTED" - deals close on founder reputation → founder-dependent demand
- "Hero negotiator" - founder must close every deal → sales constraint
- "Who gives the same number of fucks?" - founder = quality standard → delivery constraint

Example Primary Constraint: "Founder-led sales and quality control. Need to transfer 'the gospel' to team so growth isn't bottlenecked by founder availability."

## EXAMPLE: STRONG KILL LIST
- Hero negotiator role (white knight)
- Excessive travel / constant presence required
- Admin / Users / Stupid shit / 2MFA
- Union shop projects
- Movie business work
- Projects with unachievable scope
- Adopting client legacy approaches
- Making false promises

## EXAMPLE: PARANOIA MAP
- AI: "Threat of smaller tasks going into a prompt. Content creation becoming a commodity."
- In-House: "In-house teams. Volume removes agency need."
- Price Compression: "Budget pressure from clients doing more in-house."
- Speed Commoditization: "SHOOT ON IPHONE - 'We don't need film' mentality."

## EXAMPLE: SWIMLANE OBJECTIVES BY TIMEFRAME
For each area, define:
- 0-90 Days: Quick wins, document current state
- 3-12 Months: Systematic change, remove founder dependencies
- 12-24 Months: Scalable, self-sustaining systems

Example Founder Role Swimlane:
- 0-90d Objective: "Stop doing admin" → Kill: Admin/stupid shit, Hero negotiator, Excessive travel
- 3-12mo Objective: "Focus on growth only" → Predictable growth activities, New client care, Spread the gospel
- 12-24mo Objective: "Strategic only" → Building culture of epic, Energized running it not trapped

## RECAP FRAMEWORK (use this to summarize):
(1) We are [specific function]. We are not [anti-positioning].
(2) We win on [specific advantage], not [what we don't compete on].
(3) We don't [boundary/promise].
(4) Our wedge is [intersection/unique position].
(5) We die because of [specific threats].

Reference the canvas data when answering questions.`;

      // Add canvas context if provided
      if (canvas) {
        systemPrompt += `\n\n## CURRENT CANVAS STATE:\n${JSON.stringify(canvas, null, 2)}`;
      }
    }

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
