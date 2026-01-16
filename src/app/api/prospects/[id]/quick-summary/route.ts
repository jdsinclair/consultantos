import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClient } from "@/lib/db/clients";
import { getSources } from "@/lib/db/sources";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const quickSummarySchema = z.object({
  verdict: z.enum(["strong_pass", "worth_exploring", "proceed_with_caution", "hard_pass"]),
  oneLiner: z.string().describe("A single punchy sentence capturing the essence"),
  keyStrength: z.string().describe("The ONE thing that's most compelling"),
  keyRisk: z.string().describe("The ONE thing that's most concerning"),
  tarpitScore: z.number().min(1).max(10).describe("1-10 how much this looks like a tarpit idea"),
  biasWarning: z.string().describe("The main bias to watch out for"),
  nextQuestion: z.string().describe("The most important question to ask them"),
});

const QUICK_SUMMARY_PROMPT = `You are a ruthlessly honest startup consultant. You need to give a QUICK, AGGRESSIVE assessment of this prospect.

Your job is to cut through the noise and give the consultant:
1. A verdict: Is this worth their time?
2. A one-liner that captures the essence
3. The single biggest strength
4. The single biggest risk
5. How much this looks like a tarpit idea (1-10)
6. The main bias the consultant should watch for
7. The ONE question that will reveal the most

Be DIRECT. Be BLUNT. No corporate speak. No hedging.

Tarpit scoring:
- 1-3: Unique opportunity, clear path
- 4-6: Some concerning patterns, needs more digging
- 7-10: Classic tarpit indicators, proceed with extreme caution

Verdicts:
- strong_pass: This looks genuinely interesting, pursue actively
- worth_exploring: Interesting enough to dig deeper
- proceed_with_caution: Red flags present, be careful
- hard_pass: Classic tarpit or major issues, probably not worth time`;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    // Get prospect info
    const client = await getClient(params.id, user.id);
    if (!client) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Get sources for additional context
    const sources = await getSources(params.id, user.id);
    const sourceContext = sources
      .filter(s => s.content && s.processingStatus === "completed")
      .map(s => `[${s.name}]: ${(s.content || "").slice(0, 2000)}`)
      .join("\n\n")
      .slice(0, 8000);

    const contextParts = [
      `Company/Name: ${client.company || client.name}`,
      client.website ? `Website: ${client.website}` : null,
      client.industry ? `Industry: ${client.industry}` : null,
      client.description ? `Description: ${client.description}` : null,
      client.evaluation ? `Previous Evaluation Summary: ${(client.evaluation as { summary: string }).summary}` : null,
      client.evaluation ? `Previous Fit Score: ${(client.evaluation as { fitScore: number }).fitScore}/10` : null,
      sourceContext ? `\n--- Documents ---\n${sourceContext}` : null,
    ].filter(Boolean).join("\n");

    const { object: summary } = await generateObject({
      model: anthropic("claude-3-5-haiku-latest"),
      schema: quickSummarySchema,
      system: QUICK_SUMMARY_PROMPT,
      prompt: `Evaluate this prospect:\n\n${contextParts}`,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Quick summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
