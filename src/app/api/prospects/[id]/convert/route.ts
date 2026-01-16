import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClient, updateClient } from "@/lib/db/clients";
import { getClientMessages } from "@/lib/db/messages";
import { createSource, updateSourceContent } from "@/lib/db/sources";
import { generateClarityInsightsFromSource } from "@/lib/ai/clarity-insights";
import { db } from "@/db";
import { clarityDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    // Get the prospect
    const prospect = await getClient(params.id, user.id);
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.status !== "prospect") {
      return NextResponse.json({ error: "Not a prospect" }, { status: 400 });
    }

    // Get eval chat messages
    const messages = await getClientMessages(params.id, user.id);

    // If there are messages, save them as a source document
    if (messages.length > 0) {
      // Format messages as readable document
      const chatContent = messages
        .map((m) => {
          const role = m.role === "user" ? "Consultant" : "AI Analysis";
          return `## ${role}\n${m.content}`;
        })
        .join("\n\n---\n\n");

      const fullContent = `# Prospect Evaluation Conversation

**Prospect:** ${prospect.name}${prospect.company ? ` (${prospect.company})` : ""}
**Evaluated:** ${new Date().toISOString().split("T")[0]}

---

${chatContent}`;

      // Create source document
      const source = await createSource({
        clientId: params.id,
        userId: user.id,
        type: "document",
        name: "Prospect Evaluation Notes",
        originalName: "prospect-eval-conversation.md",
        fileType: "md",
        processingStatus: "completed",
      });

      // Save the content
      await updateSourceContent(source.id, user.id, fullContent);

      // Generate clarity insights from the evaluation conversation
      try {
        await generateClarityInsightsFromSource(fullContent, {
          sourceId: source.id,
          clientId: params.id,
          userId: user.id,
          sourceName: "Prospect Evaluation Notes",
          sourceType: "document",
          userProfile: {
            name: user.name,
            nickname: user.nickname,
            bio: user.bio,
            specialties: user.specialties,
            businessName: user.businessName,
          },
        });
      } catch (error) {
        console.error("Failed to generate clarity insights:", error);
        // Continue with conversion even if insights fail
      }
    }

    // Also save the structured evaluation if it exists
    if (prospect.evaluation) {
      const evalContent = `# Prospect Evaluation Summary

**Prospect:** ${prospect.name}${prospect.company ? ` (${prospect.company})` : ""}
**Fit Score:** ${prospect.evaluation.fitScore}/10
**Evaluated:** ${prospect.evaluation.evaluatedAt}

## Summary
${prospect.evaluation.summary}

## Why We Love It
${prospect.evaluation.whyWeLoveIt.map((item: string) => `- ${item}`).join("\n")}

## Why We Hate It
${prospect.evaluation.whyWeHateIt.map((item: string) => `- ${item}`).join("\n")}

## Potential Biases
${prospect.evaluation.potentialBiases.map((item: string) => `- ${item}`).join("\n")}

## Key Insights
${prospect.evaluation.keyInsights.map((item: string) => `- ${item}`).join("\n")}

## Market Position
${prospect.evaluation.marketPosition}

## Competitive Advantage
${prospect.evaluation.competitiveAdvantage}

## Biggest Risks
${prospect.evaluation.biggestRisks.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}

## Recommended Approach
${prospect.evaluation.recommendedApproach}`;

      // Create source for structured evaluation
      const evalSource = await createSource({
        clientId: params.id,
        userId: user.id,
        type: "document",
        name: "Prospect Evaluation Report",
        originalName: "prospect-eval-report.md",
        fileType: "md",
        processingStatus: "completed",
      });

      await updateSourceContent(evalSource.id, user.id, evalContent);
    }

    // Create empty clarity document if it doesn't exist
    const existingClarity = await db.query.clarityDocuments.findFirst({
      where: eq(clarityDocuments.clientId, params.id),
    });

    if (!existingClarity) {
      await db.insert(clarityDocuments).values({
        clientId: params.id,
        userId: user.id,
      });
    }

    // Convert to active client
    const updatedClient = await updateClient(params.id, user.id, {
      status: "active",
    });

    return NextResponse.json({
      client: updatedClient,
      message: "Prospect converted to client. Evaluation notes saved as sources.",
    });
  } catch (error) {
    console.error("Conversion failed:", error);
    return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
  }
}
