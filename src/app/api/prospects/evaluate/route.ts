import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { updateProspectEvaluation, getClient } from "@/lib/db/clients";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const evaluationSchema = z.object({
  summary: z.string().describe("2-3 sentence summary of the business/idea"),
  whyWeLoveIt: z.array(z.string()).describe("3-5 reasons why this is compelling"),
  whyWeHateIt: z.array(z.string()).describe("3-5 concerns, red flags, or weaknesses"),
  potentialBiases: z.array(z.string()).describe("2-3 cognitive biases that might affect our judgment"),
  keyInsights: z.array(z.string()).describe("3-5 unique insights that show deep understanding"),
  marketPosition: z.string().describe("Where they sit in the market landscape"),
  competitiveAdvantage: z.string().describe("Their potential moat or differentiator"),
  biggestRisks: z.array(z.string()).describe("Top 3 existential risks"),
  recommendedApproach: z.string().describe("How we should approach working with them"),
  fitScore: z.number().min(1).max(10).describe("1-10 score on how good a fit this is for consulting"),
});

const EVALUATION_PROMPT = `You are a senior startup consultant evaluating a potential prospect.

Your job is to provide a balanced, insightful evaluation that demonstrates:
1. Deep understanding of their business model and market
2. Critical thinking about strengths AND weaknesses
3. Awareness of your own potential biases
4. Unique insights they probably haven't heard before

Be direct. Be honest. Don't sugarcoat problems but also highlight genuine strengths.
Your insights should make them feel "this person really gets us."

The evaluation framework:
- Summary: Quick 2-3 sentence overview
- Why We Love It: What's genuinely compelling
- Why We Hate It: Real concerns (not surface-level)
- Potential Biases: What biases might cloud our judgment
- Key Insights: Unique observations that show understanding
- Market Position: Where they sit competitively
- Competitive Advantage: What could be their moat
- Biggest Risks: Existential threats
- Recommended Approach: How we should work with them
- Fit Score: 1-10 consulting fit`;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { clientId, websiteContent, additionalContext } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // Get client info
    const client = await getClient(clientId, user.id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contextParts = [
      `Company: ${client.company || client.name}`,
      client.website ? `Website: ${client.website}` : null,
      client.industry ? `Industry: ${client.industry}` : null,
      client.description ? `Description: ${client.description}` : null,
      websiteContent ? `\n--- Website Content ---\n${websiteContent}` : null,
      additionalContext ? `\n--- Additional Context ---\n${additionalContext}` : null,
    ].filter(Boolean).join("\n");

    const { object: evaluation } = await generateObject({
      model: openai("gpt-4o"),
      schema: evaluationSchema,
      system: EVALUATION_PROMPT,
      prompt: `Evaluate this prospect:\n\n${contextParts}`,
    });

    // Save evaluation to database
    const updatedClient = await updateProspectEvaluation(
      clientId,
      user.id,
      {
        ...evaluation,
        evaluatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate prospect" },
      { status: 500 }
    );
  }
}
