import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { models } from "@/lib/ai";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Prevent static caching
export const dynamic = "force-dynamic";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface FieldUpdate {
  field: string;
  value: string | string[] | null;
  displayName: string;
}

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  linkedin: "LinkedIn Profile",
  otherWebsites: "Other Websites",
  personalStory: "Your Journey",
  methodology: "Your Methodology",
  notableClients: "Notable Clients",
  contentAssets: "Content Assets",
  uniquePerspective: "Unique Perspective",
  communicationStyle: "Communication Style",
  aiContextSummary: "AI Context Summary",
};

const SYSTEM_PROMPT = `You are helping a consultant build their AI profile for a consulting OS platform. Your goal is to understand them deeply so the AI can give advice in their voice and reference their expertise.

## YOUR ROLE
You're having a conversational interview to understand:
1. Their background and journey (how they got here)
2. Their methodology and approach (how they think about consulting)
3. Their unique perspective (what makes them different)
4. Their content/IP (newsletters, books, frameworks they've created)
5. Their communication style (how they talk to clients)
6. Notable clients/experience (anonymized is fine)

## INTERVIEW STYLE
- Be conversational and warm, but efficient
- Ask follow-up questions to dig deeper
- One topic at a time - don't overwhelm
- Acknowledge what they share before moving on
- Extract specific, concrete details - avoid generic responses

## WHAT TO CAPTURE
When you have enough information about a topic, you'll output a structured JSON block that the system will parse.

Use this format when you have updates ready:
\`\`\`json
{
  "updates": [
    {"field": "personalStory", "value": "20 years in SaaS, built 3 companies..."},
    {"field": "methodology", "value": "Constraint-driven strategy, always start with what to stop..."}
  ],
  "message": "Your next conversational message to the user"
}
\`\`\`

Available fields:
- personalStory: Their journey and background
- methodology: Their consulting approach and frameworks
- notableClients: Types of clients they've worked with
- contentAssets: Content they've created (newsletters, books, etc.)
- uniquePerspective: What makes their POV different
- communicationStyle: How they communicate (comma-separated styles like "Direct & Blunt, Strategic, Data-Driven")
- linkedin: LinkedIn URL if mentioned
- otherWebsites: Array of URLs if mentioned
- aiContextSummary: A 2-3 sentence summary of who they are (create this when you have enough info)

## CONVERSATION FLOW
1. Start by understanding their background
2. Dig into their methodology
3. Explore what makes them unique
4. Ask about their content/IP
5. Understand their communication style
6. Summarize and confirm

When you feel you have a good picture (usually 5-8 exchanges), generate an aiContextSummary and mark the conversation complete.

To mark complete, include in your JSON:
\`\`\`json
{
  "updates": [...],
  "message": "...",
  "isComplete": true
}
\`\`\`

## EXAMPLE EXCHANGE

User: "I spent 15 years as a VP at various SaaS companies, then went independent 5 years ago"

Good response:
\`\`\`json
{
  "updates": [
    {"field": "personalStory", "value": "15 years as VP at SaaS companies, then independent consultant for 5 years. Deep operational experience before advisory."}
  ],
  "message": "That's a solid progression - the VP experience means you've actually done the work, not just advised on it. What was the trigger for going independent? And when you work with clients now, what's your typical engagement look like?"
}
\`\`\`

Be warm but efficient. Get to the substance quickly.`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, currentProfile, messages } = body;

    if (action === "start") {
      // Generate opening message based on what we already know
      const hasInfo = currentProfile?.personalStory || currentProfile?.methodology;

      let openingMessage: string;
      if (hasInfo) {
        openingMessage = `Hey! I see you've already shared some info about yourself. Let me review what I know and see if we can fill in any gaps.\n\nFrom what I have: ${currentProfile.personalStory ? "your background" : ""} ${currentProfile.methodology ? "your methodology" : ""}\n\nWhat would you like to add or update? Or should we start fresh and I'll ask you some questions?`;
      } else {
        openingMessage = `Hey! I'm here to help build your AI profile so the system can give advice in your voice.\n\nLet's start simple: Tell me about your consulting journey. How did you get into this work, and what's your focus now?`;
      }

      return NextResponse.json({ message: openingMessage });
    }

    if (action === "continue" && messages) {
      // Build conversation history for the AI
      const conversationMessages = messages.map((m: Message) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Add context about what we already know
      let contextNote = "";
      if (currentProfile) {
        const existingFields: string[] = [];
        if (currentProfile.personalStory) existingFields.push("personalStory");
        if (currentProfile.methodology) existingFields.push("methodology");
        if (currentProfile.notableClients) existingFields.push("notableClients");
        if (currentProfile.contentAssets) existingFields.push("contentAssets");
        if (currentProfile.uniquePerspective) existingFields.push("uniquePerspective");
        if (currentProfile.communicationStyle) existingFields.push("communicationStyle");

        if (existingFields.length > 0) {
          contextNote = `\n\n[System note: User already has data for these fields: ${existingFields.join(", ")}. Focus on filling gaps or improving existing content.]`;
        }
      }

      try {
        const response = await generateText({
          model: models.default,
          system: SYSTEM_PROMPT + contextNote,
          messages: conversationMessages,
        });

        const text = response.text;

        // Try to parse JSON from response
        let updates: FieldUpdate[] = [];
        let message = text;
        let isComplete = false;

        // Look for JSON block in response
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);

            if (parsed.updates && Array.isArray(parsed.updates)) {
              updates = parsed.updates.map((u: { field: string; value: string | string[] }) => ({
                field: u.field,
                value: u.value,
                displayName: FIELD_DISPLAY_NAMES[u.field] || u.field,
              }));
            }

            if (parsed.message) {
              message = parsed.message;
            }

            if (parsed.isComplete) {
              isComplete = true;
            }
          } catch {
            // JSON parsing failed, use raw text as message
            message = text.replace(/```json[\s\S]*?```/g, "").trim();
          }
        }

        return NextResponse.json({
          message,
          updates,
          isComplete,
        });
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        return NextResponse.json({
          message: "I had trouble processing that. Could you tell me more about your consulting background?",
          updates: [],
          isComplete: false,
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("AI profile builder error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
