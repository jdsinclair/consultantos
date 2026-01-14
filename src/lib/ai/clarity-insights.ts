import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { withAILogging } from "./logger";
import { createClarityInsight, getClarityDocument } from "@/lib/db/clarity";

interface ClarityInsightSuggestion {
  fieldName: string;
  suggestedValue: string;
  reasoning: string;
  confidence: number;
}

/**
 * Generate clarity insights from source content
 * Called when a source is processed to suggest updates to the clarity document
 */
export async function generateClarityInsightsFromSource(
  content: string,
  context: {
    sourceId: string;
    clientId: string;
    userId: string;
    sourceName: string;
    sourceType: string;
    userProfile?: {
      name?: string | null;
      nickname?: string | null;
      bio?: string | null;
      specialties?: string[] | null;
      businessName?: string | null;
    };
  }
): Promise<void> {
  const model = "claude-sonnet-4-20250514";

  // Get existing clarity document to understand what's already defined
  const existingClarity = await getClarityDocument(context.clientId, context.userId);

  const existingFields: Record<string, string | null> = {
    niche: existingClarity?.niche || null,
    desiredOutcome: existingClarity?.desiredOutcome || null,
    offer: existingClarity?.offer || null,
    whoWeAre: existingClarity?.whoWeAre || null,
    whatWeDo: existingClarity?.whatWeDo || null,
    howWeDoIt: existingClarity?.howWeDoIt || null,
    ourWedge: existingClarity?.ourWedge || null,
    whyPeopleLoveUs: existingClarity?.whyPeopleLoveUs || null,
    howWeWillDie: existingClarity?.howWeWillDie || null,
  };

  try {
    const suggestions = await withAILogging(
      "clarity-insights",
      model,
      async () => {
        // Truncate content if too long
        const maxContentLength = 12000;
        let truncatedContent = content;
        if (content.length > maxContentLength) {
          const half = Math.floor(maxContentLength / 2);
          truncatedContent = content.slice(0, half) + "\n\n[...content truncated...]\n\n" + content.slice(-half);
        }

        // Build user context section
        let userContextSection = "";
        if (context.userProfile) {
          const { name, nickname, bio, specialties, businessName } = context.userProfile;
          const parts: string[] = [];
          if (nickname || name) parts.push(`Consultant: ${nickname || name}`);
          if (businessName) parts.push(`Business: ${businessName}`);
          if (bio) parts.push(`Background: ${bio}`);
          if (specialties?.length) parts.push(`Focus Areas: ${specialties.join(", ")}`);
          if (parts.length > 0) {
            userContextSection = `\n\nCONSULTANT PROFILE (consider their perspective when suggesting insights):\n${parts.join("\n")}\n`;
          }
        }

        const prompt = `You are analyzing a document to extract business clarity insights for a consulting client.${userContextSection}

SOURCE DOCUMENT (${context.sourceName}):
${truncatedContent}

EXISTING CLARITY DOCUMENT STATE:
${Object.entries(existingFields)
  .map(([key, value]) => `- ${key}: ${value ? `"${value.slice(0, 200)}${value.length > 200 ? '...' : ''}"` : '(empty)'}`)
  .join('\n')}

TASK: Identify any insights from this document that could inform or update the client's clarity document.

For each field, consider:
- niche: Who they serve (target market, customer segment)
- desiredOutcome: What outcome they help customers achieve
- offer: How they deliver their solution (product, service, methodology)
- whoWeAre: Company identity, values, mission
- whatWeDo: Core services/products offered
- howWeDoIt: Their process, methodology, approach
- ourWedge: Unique differentiator, competitive advantage
- whyPeopleLoveUs: Customer testimonials, value propositions
- howWeWillDie: Risks, threats, competitive dangers

Return a JSON array of suggestions (0-3 max, only include if there's strong evidence):
[
  {
    "fieldName": "whatWeDo",
    "suggestedValue": "The actual content to suggest",
    "reasoning": "Why this is relevant based on the document",
    "confidence": 0.85
  }
]

Rules:
- Only suggest updates if there's clear, relevant content in the document
- Confidence should be 0.5-1.0 (only include suggestions with confidence > 0.6)
- Prefer to update empty fields over replacing existing content
- If suggesting an update to an existing field, make it an enhancement, not a replacement
- Return an empty array [] if no strong insights are found
- Return ONLY valid JSON, no other text.`;

        console.log(`[Clarity Insights] Analyzing source: ${context.sourceName}`);

        const { text } = await generateText({
          model: anthropic(model),
          prompt,
          maxTokens: 2000,
        });

        // Strip markdown code blocks if present (```json ... ```)
        let jsonText = text.trim();
        if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }

        const result = JSON.parse(jsonText);
        return Array.isArray(result) ? result : [];
      },
      { sourceName: context.sourceName, sourceId: context.sourceId }
    );

    // Create insight records for valid suggestions
    for (const suggestion of suggestions as ClarityInsightSuggestion[]) {
      if (suggestion.confidence >= 0.6 && suggestion.fieldName && suggestion.suggestedValue) {
        await createClarityInsight({
          clientId: context.clientId,
          userId: context.userId,
          fieldName: suggestion.fieldName,
          suggestedValue: suggestion.suggestedValue,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence,
          sourceType: context.sourceType,
          sourceId: context.sourceId,
          sourceContext: `From: ${context.sourceName}`,
          status: "pending",
        });
        console.log(`[Clarity Insights] Created insight for ${suggestion.fieldName} (${Math.round(suggestion.confidence * 100)}% confidence)`);
      }
    }
  } catch (error) {
    console.error("Clarity insights generation error:", error);
    // Don't throw - insights generation is optional
  }
}
