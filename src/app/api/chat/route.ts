import { streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { models, systemPrompts, buildClientContext } from "@/lib/ai";
import { getClient } from "@/lib/db/clients";
import { getSources } from "@/lib/db/sources";
import { getSessions } from "@/lib/db/sessions";
import { getPersona } from "@/lib/db/personas";
import { getClarityDocument } from "@/lib/db/clarity";
import { getClarityMethodCanvas } from "@/lib/db/clarity-method";
import { searchRelevantChunks, buildContextFromChunks, searchPersonalKnowledge } from "@/lib/rag";
import { buildCanvasContext } from "@/lib/clarity-method/rag-integration";
import { logCompletedAICall } from "@/lib/ai/logger";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

/**
 * Build consultant context from user's AI profile
 */
function buildConsultantContext(user: {
  name: string | null;
  nickname: string | null;
  businessName: string | null;
  bio: string | null;
  specialties: string[] | null;
  personalStory: string | null;
  methodology: string | null;
  notableClients: string | null;
  uniquePerspective: string | null;
  communicationStyle: string | null;
  aiContextSummary: string | null;
}): string {
  const parts: string[] = [];

  // Start with the AI-generated summary if available
  if (user.aiContextSummary) {
    parts.push(`## About the Consultant\n\n${user.aiContextSummary}`);
  } else if (user.name || user.businessName) {
    parts.push(`## About the Consultant\n\nYou are assisting ${user.nickname || user.name || 'the consultant'}${user.businessName ? ` of ${user.businessName}` : ''}.`);
  }

  // Add methodology if available
  if (user.methodology) {
    parts.push(`### Methodology & Approach\n\n${user.methodology}`);
  }

  // Add unique perspective
  if (user.uniquePerspective) {
    parts.push(`### Unique Perspective\n\n${user.uniquePerspective}`);
  }

  // Add background
  if (user.personalStory) {
    parts.push(`### Background\n\n${user.personalStory}`);
  }

  // Add notable experience
  if (user.notableClients) {
    parts.push(`### Experience & Clients\n\n${user.notableClients}`);
  }

  // Add communication style
  if (user.communicationStyle) {
    parts.push(`### Communication Style\n\nMatch this consultant's style: ${user.communicationStyle}`);
  }

  // Add specialties
  if (user.specialties && user.specialties.length > 0) {
    parts.push(`### Areas of Expertise\n\n${user.specialties.join(', ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return parts.join('\n\n') + '\n\n---\n\nWhen giving advice, draw from the consultant\'s methodology and perspective above. Speak as if you are their strategic thinking partner who deeply understands their approach.\n';
}

export async function POST(req: Request) {
  try {
    // Pre-flight check: API key (check at runtime, not module load)
    if (!process.env.ANTHROPIC_API_KEY) {
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

    // Prospect Evaluation context - contrarian, tarpit-aware analysis
    if (context === "prospect-eval") {
      systemPrompt = `You are a seasoned startup consultant helping evaluate a potential prospect/client opportunity.

## YOUR ROLE
You are NOT a yes-man. You are a critical thinking partner who helps the consultant:
1. See past their own biases and blind spots
2. Identify tarpit ideas that seem attractive but trap entrepreneurs
3. Ask the hard questions that need to be asked
4. Evaluate whether this is truly a good consulting opportunity

## KEY PRINCIPLES

### Be Contrarian
- Challenge assumptions. If something sounds "obvious," question it.
- If the idea sounds too good, look for the catch.
- If everyone else thinks it's great, ask why no one has succeeded at it.
- Play devil's advocate even when you see merit.

### Watch for Tarpit Indicators
Tarpits are ideas that seem attractive but trap entrepreneurs. Look for:

**Market Tarpits:**
- Crowded markets with many failed attempts (social apps, todo lists, CRMs)
- Markets where distribution is the real problem, not product
- Markets dominated by giants with switching costs
- "Uber for X" ideas where X doesn't have the dynamics that made Uber work

**Problem Tarpits:**
- Vitamin problems (nice-to-have, not painkiller)
- Problems that people SAY they have but won't PAY to solve
- Problems that seem universal but are actually rare
- Problems that are symptoms, not root causes

**Founder Tarpits:**
- Building for themselves without market validation
- Expertise in the problem but not the business model
- Falling in love with the solution, not the problem
- Massive vision but no concrete first step

### Bias Check
Always consider these consultant biases:
- **Shiny Object Bias**: Exciting tech/market ≠ good business
- **Founder Charisma Bias**: Likeable founder ≠ viable business
- **Domain Expertise Bias**: Just because YOU understand it doesn't mean it's good
- **Recency Bias**: Recent successes in a space don't predict future ones
- **Confirmation Bias**: Looking for reasons to say yes
- **Sunk Cost Bias**: Already invested time evaluating = want it to work out

## HOW TO EVALUATE

### Key Questions to Drive:
1. **Why now?** What changed that makes this possible/necessary?
2. **Why them?** What unfair advantage do they have?
3. **Why this?** What makes this the right approach?
4. **Who's paying?** Is there a real buyer with budget and urgency?
5. **What kills this?** What's the most likely failure mode?
6. **What's been tried?** Why did others fail?

### Red Flags to Watch:
- Vague target customer ("small businesses", "everyone")
- No clear monetization ("we'll figure it out later")
- Feature-focused, not problem-focused
- Competitors dismissed too easily
- No concrete traction or validation
- Founder can't articulate why THEY should build this

### Green Flags to Acknowledge:
- Deep domain expertise from actual experience
- Clear, specific, paying customer segment
- Evidence of demand (waitlist, LOIs, pre-sales)
- Unique insight others don't have
- Strong "why now" with market timing
- Founder-market fit that's hard to replicate

## OUTPUT STYLE
- Be direct. No fluff. No corporate speak.
- Use bullet points for clarity.
- Give specific, actionable questions to ask.
- If something is concerning, say it plainly.
- If something is genuinely impressive, acknowledge it.
- End with a clear recommendation or next step.

## IMPORTANT
You are helping the consultant make a BUSINESS decision. The goal is not to be negative for its own sake, but to surface the truth so the consultant can make an informed choice about investing their time.

When analyzing prospect replies or documents:
- Look for what's NOT being said
- Note defensive or evasive language
- Identify concrete vs vague claims
- Flag inconsistencies with earlier statements
- Recognize genuine insight vs rehearsed pitch`;
    }

    // "Do The Thing" execution plan context
    if (context === "execution-plan") {
      systemPrompt = `You are a tactical execution planner helping break down strategic objectives into detailed, actionable steps.

## YOUR ROLE:
- Help break down complex initiatives into concrete action items
- Identify missing steps, dependencies, and potential blockers
- Suggest logical ordering and groupings
- Point out risks and what could go wrong
- Help define measurable success metrics
- Challenge vague items with "what specifically needs to happen?"

## WHEN REVIEWING A PLAN:
1. Check for completeness - are there missing steps?
2. Check for order - are dependencies captured?
3. Check for clarity - would someone else understand what to do?
4. Check for risk - what could derail this?
5. Check for measurement - how do we know it worked?

## GOOD ACTION ITEMS:
- Specific: "Email Sarah at Acme Corp with proposal" not "Send emails"
- Actionable: Starts with a verb (Draft, Send, Call, Build, Fix)
- Completable: Can be marked "done" at a specific point
- Assigned: Clear who does it (even if implicit "me")

## EXAMPLE SECTION STRUCTURE:
(a) Setup & Prerequisites - things that must happen first
(b) Core Actions - the main work
(c) Follow-up & Iteration - what happens after

## WHEN SUGGESTING RULES/CONSTRAINTS:
Think about:
- Who needs to approve things?
- What should NOT happen without certain conditions?
- What are the hard boundaries?
- What are the timing constraints?

## WHEN THE USER ASKS YOU TO ADD/EDIT THE PLAN:
When the user asks to add sections or items to the plan, format your suggestions clearly so they can easily add them:

For new sections, use this format:
**📂 ADD SECTION: "(a) Section Name"**

For new items in a section, use this format:
**➕ ADD TO [section name]:**
- Item 1 text
- Item 2 text
- Item 3 text

For sub-items, indent them:
**➕ ADD TO [section name]:**
- Main item
  - Sub-item 1
  - Sub-item 2

The user can then copy these directly or ask you to elaborate on any item.

## WHEN USER SHARES IMAGES/DOCUMENTS:
If the user shares a whiteboard, diagram, or document:
1. List out every item you can see
2. Organize them into logical sections
3. Identify what's missing or unclear
4. Suggest the order of operations

Be direct. Help the user see what they're missing.`;

      // Add plan context if provided
      if (body.plan) {
        systemPrompt += `\n\n## CURRENT PLAN STATE:\n${JSON.stringify(body.plan, null, 2)}`;
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

    // Build full system message with consultant and client context
    let fullSystemPrompt = systemPrompt;

    // Fetch user profile for consultant context
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user) {
        const consultantContext = buildConsultantContext({
          name: user.name,
          nickname: user.nickname,
          businessName: user.businessName,
          bio: user.bio,
          specialties: user.specialties,
          personalStory: user.personalStory,
          methodology: user.methodology,
          notableClients: user.notableClients,
          uniquePerspective: user.uniquePerspective,
          communicationStyle: user.communicationStyle,
          aiContextSummary: user.aiContextSummary,
        });

        if (consultantContext) {
          fullSystemPrompt += "\n\n" + consultantContext;
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }

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
              // Include personal sources (consultant's knowledge base) in the search
              const relevantChunks = await searchRelevantChunks(
                lastUserMessage.content,
                clientId,
                userId,
                8, // Get top 8 relevant chunks
                0.5, // Lower threshold to get more results
                true // Include personal knowledge sources
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

    // If no clientId, still search personal knowledge for strategy/methodology questions
    if (!clientId) {
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find((m: { role: string }) => m.role === "user");

      if (lastUserMessage?.content) {
        try {
          // Search personal knowledge base
          const personalChunks = await searchPersonalKnowledge(
            lastUserMessage.content,
            userId,
            5, // Get top 5 relevant chunks from personal knowledge
            0.5
          );

          if (personalChunks.length > 0) {
            let personalContext = "## Your Knowledge & Methodology\n\n";
            personalContext += personalChunks.map((chunk) => {
              return `[From: ${chunk.sourceName}${chunk.personalCategory ? ` (${chunk.personalCategory})` : ''}]\n${chunk.content}`;
            }).join('\n\n---\n\n');

            fullSystemPrompt += "\n\n" + personalContext;
          }
        } catch (ragError) {
          console.error("Personal knowledge search failed:", ragError);
        }
      }
    }

    // Extract the user's last message for logging
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m: { role: string; content: string }) => m.role === "user");
    const userPrompt = lastUserMessage?.content || "(no user message)";

    try {
      console.log("[Chat] Starting stream with model: claude-sonnet-4-20250514");
      const startTime = Date.now();
      const result = await streamText({
        model: models.default,
        system: fullSystemPrompt,
        messages,
        onFinish: async ({ text, usage }) => {
          const duration = Date.now() - startTime;
          console.log("[Chat] Completed:", {
            textLength: text.length,
            usage
          });
          // Log the completed chat call
          await logCompletedAICall({
            operation: "chat",
            model: "claude-sonnet-4-20250514",
            status: "success",
            duration,
            inputTokens: usage?.promptTokens,
            outputTokens: usage?.completionTokens,
            metadata: {
              clientId: clientId || "none",
              personaId: personaId || "default",
              messageCount: messages.length,
            },
            prompt: userPrompt,
            systemPrompt: fullSystemPrompt.slice(0, 5000) + (fullSystemPrompt.length > 5000 ? "..." : ""),
            response: text,
          });
        },
      });

      return result.toDataStreamResponse({
        getErrorMessage: (error) => {
          console.error("[Chat] Stream error during response:", error);
          // Log full error details for debugging
          if (error instanceof Error) {
            console.error("[Chat] Error name:", error.name);
            console.error("[Chat] Error message:", error.message);
            console.error("[Chat] Error stack:", error.stack);

            // Check for common error patterns
            const msg = error.message.toLowerCase();
            if (msg.includes("api key") || msg.includes("authentication") || msg.includes("unauthorized")) {
              return "Invalid API key. Please check your ANTHROPIC_API_KEY configuration.";
            }
            if (msg.includes("rate limit") || msg.includes("429") || msg.includes("too many requests")) {
              return "Rate limited. Please try again in a moment.";
            }
            if (msg.includes("credit") || msg.includes("billing") || msg.includes("payment")) {
              return "Billing issue with AI provider. Please check your account.";
            }
            if (msg.includes("model") || msg.includes("not found") || msg.includes("invalid")) {
              return `Model error: ${error.message}. The AI model may be temporarily unavailable.`;
            }
            return `AI Error: ${error.message}`;
          }
          return "An unexpected error occurred while generating response.";
        },
      });
    } catch (streamError) {
      // Log full error details for debugging
      console.error("[Chat] Stream setup error:", streamError);
      if (streamError instanceof Error) {
        console.error("[Chat] Error name:", streamError.name);
        console.error("[Chat] Error message:", streamError.message);
        console.error("[Chat] Error stack:", streamError.stack);
        // Log any additional error properties
        console.error("[Chat] Error details:", JSON.stringify(streamError, Object.getOwnPropertyNames(streamError)));
      }

      const errorMessage = streamError instanceof Error ? streamError.message : "Unknown error";

      // Log the failed chat call
      await logCompletedAICall({
        operation: "chat",
        model: "claude-sonnet-4-20250514",
        status: "error",
        error: errorMessage,
        metadata: {
          clientId: clientId || "none",
          personaId: personaId || "default",
          messageCount: messages.length,
        },
        prompt: userPrompt,
        systemPrompt: fullSystemPrompt.slice(0, 5000) + (fullSystemPrompt.length > 5000 ? "..." : ""),
      });
      const errorLower = errorMessage.toLowerCase();

      if (errorLower.includes("api key") || errorLower.includes("authentication") || errorLower.includes("unauthorized")) {
        return new Response(
          JSON.stringify({ error: "Invalid API key", details: "Please check your ANTHROPIC_API_KEY configuration" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (errorLower.includes("rate limit") || errorLower.includes("429") || errorLower.includes("too many requests")) {
        return new Response(
          JSON.stringify({ error: "Rate limited", details: "Too many requests, please try again later" }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      if (errorLower.includes("credit") || errorLower.includes("billing") || errorLower.includes("payment")) {
        return new Response(
          JSON.stringify({ error: "Billing issue", details: "Check your AI provider account" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }

      // For model-related errors, provide more context
      if (errorLower.includes("model") || errorLower.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Model unavailable",
            details: errorMessage,
            suggestion: "The AI model may be temporarily unavailable. Please try again."
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
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
