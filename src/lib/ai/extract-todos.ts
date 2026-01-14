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
