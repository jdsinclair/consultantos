import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const ExtractedTodoSchema = z.object({
  title: z.string().describe("Clear, actionable task title"),
  description: z.string().optional().describe("Additional context if needed"),
  ownerType: z.enum(["me", "client"]).describe("Who is responsible for this task"),
  owner: z.string().optional().describe("Specific person's name if mentioned"),
  priority: z.enum(["low", "medium", "high", "urgent"]).describe("Priority based on urgency cues"),
  dueDate: z.string().optional().describe("ISO date string if a deadline is mentioned"),
  sourceContext: z.string().describe("The exact quote or excerpt where this was mentioned"),
});

const ExtractionResultSchema = z.object({
  todos: z.array(ExtractedTodoSchema),
  summary: z.string().optional().describe("Brief summary of the content if relevant"),
});

export type ExtractedTodo = z.infer<typeof ExtractedTodoSchema>;

/**
 * Extract TODOs from a block of text using AI
 */
export async function extractTodosFromText(
  text: string,
  context?: {
    clientName?: string;
    userName?: string;
    isTranscript?: boolean;
    isEmail?: boolean;
    isNote?: boolean;
  }
): Promise<ExtractedTodo[]> {
  const contextHints = [];
  if (context?.clientName) {
    contextHints.push(`Client name: ${context.clientName}`);
  }
  if (context?.userName) {
    contextHints.push(`User (consultant) name: ${context.userName}`);
  }
  if (context?.isTranscript) {
    contextHints.push("This is a meeting/call transcript");
  }
  if (context?.isEmail) {
    contextHints.push("This is an email");
  }
  if (context?.isNote) {
    contextHints.push("This is a note");
  }

  const systemPrompt = `You are an expert at identifying action items and commitments in text.

Extract all TODOs, action items, commitments, and tasks from the given text.

Rules:
1. Look for explicit commitments: "I'll do X", "We need to", "Action item:", "TODO:", "Let's", "Can you"
2. Look for implicit tasks: questions that need answers, requests, follow-ups mentioned
3. Identify who is responsible: "me" (the consultant/user) or "client"
4. Detect urgency cues: "ASAP", "urgent", "by Friday", "immediately" = high/urgent
5. Extract any mentioned deadlines and convert to ISO dates (assume current year if not specified)
6. Include the exact quote/context where the task was mentioned (sourceContext)
7. Make titles actionable and clear (start with a verb when possible)
8. Don't create duplicate tasks for the same thing mentioned multiple times
9. If someone says "I'll send you X" - that's their TODO, not yours

${contextHints.length > 0 ? `\nContext:\n${contextHints.join("\n")}` : ""}

Today's date: ${new Date().toISOString().split("T")[0]}`;

  try {
    const result = await generateObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: ExtractionResultSchema,
      system: systemPrompt,
      prompt: `Extract all action items and TODOs from this text:\n\n${text}`,
      temperature: 0.3,
    });

    return result.object.todos;
  } catch (error) {
    console.error("Failed to extract TODOs:", error);
    return [];
  }
}

/**
 * Extract TODOs from a transcript with timestamp awareness
 */
export async function extractTodosFromTranscript(
  transcript: string,
  chunks?: Array<{ text: string; timestamp: string }>,
  context?: { clientName?: string; userName?: string }
): Promise<(ExtractedTodo & { timestamp?: string })[]> {
  // If we have timestamped chunks, include timestamp info
  const textWithTimestamps = chunks
    ? chunks.map((c) => `[${c.timestamp}] ${c.text}`).join("\n")
    : transcript;

  const todos = await extractTodosFromText(textWithTimestamps, {
    ...context,
    isTranscript: true,
  });

  // Try to extract timestamps from sourceContext if they were included
  return todos.map((todo) => {
    const timestampMatch = todo.sourceContext?.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
    return {
      ...todo,
      timestamp: timestampMatch?.[1],
    };
  });
}

/**
 * Quick parse of a simple text block into separate TODOs
 * (for when user pastes a list)
 */
export async function parseBulkTodos(
  text: string
): Promise<{ title: string; priority: string }[]> {
  // First try simple line-by-line parsing for obvious lists
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Remove common list prefixes
      return line
        .replace(/^[-•*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/^\[[ x]?\]\s*/i, "")
        .trim();
    })
    .filter((line) => line.length > 3); // Filter out very short items

  // If it looks like a simple list (3+ items, short lines), just return them
  if (lines.length >= 3 && lines.every((l) => l.length < 200)) {
    return lines.map((title) => ({ title, priority: "medium" as const }));
  }

  // Otherwise, use AI to parse more complex text
  const extracted = await extractTodosFromText(text);
  return extracted.map((t) => ({
    title: t.title,
    priority: t.priority || "medium",
  }));
}

/**
 * Analyze an email for action items
 */
export async function extractTodosFromEmail(
  email: {
    from: string;
    subject: string;
    body: string;
  },
  context?: { clientName?: string; userName?: string }
): Promise<ExtractedTodo[]> {
  const emailText = `From: ${email.from}
Subject: ${email.subject}

${email.body}`;

  return extractTodosFromText(emailText, {
    ...context,
    isEmail: true,
  });
}

// Schema for comprehensive session insights
const SessionInsightsSchema = z.object({
  // Action items (individual tasks)
  actionItems: z.array(ExtractedTodoSchema),

  // Gameplan / Next Steps (more detailed multi-step plans)
  nextSteps: z.array(z.object({
    title: z.string().describe("Title of this phase or initiative"),
    description: z.string().describe("Detailed description of what needs to happen"),
    timeframe: z.string().optional().describe("When this should happen (e.g., 'next 30 days', 'Q1', 'week 1')"),
    owner: z.enum(["me", "client", "both"]).describe("Who is primarily responsible"),
    substeps: z.array(z.string()).optional().describe("Breakdown of smaller steps within this initiative"),
  })).describe("Larger initiatives, phases, or multi-step plans discussed"),

  // Key decisions made
  decisions: z.array(z.object({
    decision: z.string().describe("What was decided"),
    context: z.string().optional().describe("Why or how this decision was reached"),
    implications: z.array(z.string()).optional().describe("What this decision means for next steps"),
  })).optional(),

  // Important insights or realizations
  insights: z.array(z.string()).optional().describe("Key insights, realizations, or strategic observations"),

  // Summary
  summary: z.string().describe("2-3 sentence summary of the session"),
});

export type SessionInsights = z.infer<typeof SessionInsightsSchema>;

/**
 * Extract comprehensive insights from a session transcript
 * Includes action items, next steps/gameplan, decisions, and key insights
 */
export async function extractSessionInsights(
  transcript: string,
  context?: {
    clientName?: string;
    userName?: string;
    sessionTitle?: string;
  }
): Promise<SessionInsights> {
  const contextInfo = [];
  if (context?.clientName) contextInfo.push(`Client: ${context.clientName}`);
  if (context?.userName) contextInfo.push(`Consultant: ${context.userName}`);
  if (context?.sessionTitle) contextInfo.push(`Session: ${context.sessionTitle}`);

  const systemPrompt = `You are an expert consultant assistant analyzing a session transcript.

Extract all valuable information from this consulting session:

1. **ACTION ITEMS**: Individual tasks that someone committed to doing
   - Look for: "I'll do", "Can you", "We need to", "Action item", commitments
   - Identify owner: consultant ("me") or client
   - Note any deadlines mentioned

2. **NEXT STEPS / GAMEPLAN**: Larger initiatives or multi-step plans discussed
   - These are more strategic than single action items
   - Could be 30-day plans, quarterly initiatives, phased approaches
   - Include any substeps or breakdown discussed
   - Note the timeframe if mentioned

3. **DECISIONS**: Key decisions made during the session
   - What was agreed upon
   - Why (if discussed)
   - What it means for the work

4. **INSIGHTS**: Important realizations, strategic observations, or "aha moments"
   - Things that changed understanding
   - Key learnings about the business
   - Strategic observations

${contextInfo.length > 0 ? `\nContext:\n${contextInfo.join("\n")}` : ""}

Be thorough but don't make things up. Only extract what was actually discussed.
Today's date: ${new Date().toISOString().split("T")[0]}`;

  try {
    const result = await generateObject({
      model: anthropic("claude-3-5-sonnet-latest"),
      schema: SessionInsightsSchema,
      system: systemPrompt,
      prompt: `Analyze this session transcript and extract all insights:\n\n${transcript}`,
      temperature: 0.3,
    });

    return result.object;
  } catch (error) {
    console.error("Failed to extract session insights:", error);
    return {
      actionItems: [],
      nextSteps: [],
      summary: "Failed to analyze session",
    };
  }
}
