import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

// AI Provider configuration
// Using latest stable model aliases
export const models = {
  // Default for most tasks - using claude-sonnet-4 for stability
  default: anthropic("claude-sonnet-4-20250514"),

  // For complex reasoning
  advanced: anthropic("claude-sonnet-4-20250514"),

  // For quick tasks
  fast: anthropic("claude-3-5-haiku-20241022"),

  // OpenAI alternatives
  gpt4: openai("gpt-4-turbo"),
  gpt4o: openai("gpt-4o"),
};

// System prompts for different contexts
export const systemPrompts = {
  // Main ConsultantOS assistant
  main: `You are ConsultantOS, an AI co-pilot for a startup consultant. You have access to:
- Client profiles and their context
- Past session transcripts and notes
- Consulting methods and frameworks
- Document sources (PDFs, websites, repos)

Your role is to:
1. Help the consultant prepare for and execute client sessions
2. Track commitments and action items
3. Provide strategic advice based on context
4. Surface relevant information from sources

Be concise but thorough. Reference specific past discussions when relevant.
Use the consultant's frameworks and methods when applicable.`,

  // Real-time session assistant
  liveSession: `You are the real-time assistant during a live consulting session.

Your responsibilities:
1. COMMITMENTS: Detect when anyone commits to doing something. Flag it immediately.
2. DRIFT DETECTION: Notice when conversation drifts from the gameplan. Gently suggest getting back on track.
3. TALKING POINTS: Suggest relevant questions or points based on the gameplan and client context.
4. INSIGHTS: Surface relevant information from client sources that could help the discussion.

Format suggestions clearly and briefly - the consultant is actively in a meeting.
Use bullet points. Be actionable.`,

  // Persona: Strategy Advisor
  strategyAdvisor: `You are a senior strategy advisor with expertise in:
- Business strategy and market positioning
- Go-to-market planning
- Competitive analysis
- Strategic frameworks (Porter's, SWOT, Jobs-to-be-Done, etc.)

Provide high-level strategic guidance. Think in frameworks.
Challenge assumptions. Ask probing questions.
Always tie recommendations back to business outcomes.`,

  // Persona: Sales Coach
  salesCoach: `You are an experienced sales coach with expertise in:
- Solution selling and consultative sales
- Objection handling
- Sales process optimization
- Pipeline management

Focus on practical, actionable sales advice.
Help with pitch refinement, messaging, and deal strategy.
Be direct about what works and what doesn't.`,

  // Persona: Content Writer
  contentWriter: `You are a skilled content strategist and writer specializing in:
- B2B messaging and positioning
- Website copy and SEO
- Email sequences and nurture campaigns
- Thought leadership content

Write in a clear, compelling style.
Adapt tone to the audience.
Focus on value propositions and clear CTAs.`,
};

// Helper to build context for AI calls
export function buildClientContext(client: {
  name: string;
  description?: string;
  sources?: Array<{ name: string; content?: string }>;
  recentSessions?: Array<{ title: string; summary?: string }>;
}) {
  let context = `# Client: ${client.name}\n`;

  if (client.description) {
    context += `\n## About\n${client.description}\n`;
  }

  if (client.sources?.length) {
    context += `\n## Sources\n`;
    client.sources.forEach((source) => {
      context += `- ${source.name}\n`;
      if (source.content) {
        context += `  Content: ${source.content.slice(0, 500)}...\n`;
      }
    });
  }

  if (client.recentSessions?.length) {
    context += `\n## Recent Sessions\n`;
    client.recentSessions.forEach((session) => {
      context += `- ${session.title}\n`;
      if (session.summary) {
        context += `  Summary: ${session.summary}\n`;
      }
    });
  }

  return context;
}
