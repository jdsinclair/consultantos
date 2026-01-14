import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { withAILogging } from "./logger";

/**
 * Extract content from an image using Claude's vision capability
 */
export async function extractImageContent(
  imageUrl: string,
  context?: { clientName?: string; fileName?: string }
): Promise<{
  description: string;
  textContent: string[];
  keyElements: string[];
  suggestedLabels: string[];
}> {
  const model = "claude-sonnet-4-20250514";

  return withAILogging(
    "vision-extract",
    model,
    async () => {
      const prompt = `Analyze this image${context?.clientName ? ` (for client: ${context.clientName})` : ""}${context?.fileName ? ` (filename: ${context.fileName})` : ""}.

Provide a detailed analysis in JSON format:
{
  "description": "A comprehensive description of what this image shows (2-4 sentences)",
  "textContent": ["Array of any text visible in the image, verbatim"],
  "keyElements": ["Array of key visual elements, diagrams, or concepts shown"],
  "suggestedLabels": ["Array of suggested tags/labels for categorization"]
}

If this is a whiteboard, flowchart, or diagram:
- Describe the structure and flow
- Extract all text and labels
- Identify relationships between elements

If this is a document or screenshot:
- Extract all visible text
- Describe the layout and purpose

Return ONLY valid JSON, no other text.`;

      console.log(`[Vision] Starting extraction for: ${context?.fileName || imageUrl.slice(0, 50)}...`);

      const { text } = await generateText({
        model: anthropic(model),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: new URL(imageUrl),
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        maxTokens: 2000,
      });

      console.log(`[Vision] Response received, parsing JSON...`);
      const result = JSON.parse(text);
      return {
        description: result.description || "Image content extracted",
        textContent: result.textContent || [],
        keyElements: result.keyElements || [],
        suggestedLabels: result.suggestedLabels || [],
      };
    },
    { imageUrl: imageUrl.slice(0, 100), fileName: context?.fileName }
  ).catch((error) => {
    console.error("Vision extraction error:", error);
    return {
      description: "Failed to extract image content",
      textContent: [],
      keyElements: [],
      suggestedLabels: [],
    };
  });
}

/**
 * Generate a searchable text representation of image content for RAG
 */
export function formatImageContentForRAG(extraction: {
  description: string;
  textContent: string[];
  keyElements: string[];
  fileName?: string;
}): string {
  const parts: string[] = [];

  if (extraction.fileName) {
    parts.push(`[Image: ${extraction.fileName}]`);
  }

  parts.push(`Description: ${extraction.description}`);

  if (extraction.textContent.length > 0) {
    parts.push(`\nText Content:\n${extraction.textContent.join("\n")}`);
  }

  if (extraction.keyElements.length > 0) {
    parts.push(`\nKey Elements:\n- ${extraction.keyElements.join("\n- ")}`);
  }

  return parts.join("\n");
}
