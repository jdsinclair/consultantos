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

  return withAILogging(
    "vision-extract",
    model,
    async () => {
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

      // Strip markdown code blocks if present (```json ... ```)
      let jsonText = text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      const result = JSON.parse(jsonText);
      return {
        description: result.description || "Image content extracted",
        textContent: result.textContent || [],
        keyElements: result.keyElements || [],
        suggestedLabels: result.suggestedLabels || [],
      };
    },
    { imageUrl: imageUrl.slice(0, 100), fileName: context?.fileName },
    { prompt }
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
 * Extract visual content from a PDF using Claude's document understanding
 * This captures charts, diagrams, images that text extraction misses
 */
export async function extractPdfVisualContent(
  pdfUrl: string,
  context?: { clientName?: string; fileName?: string }
): Promise<{
  visualSummary: string;
  charts: string[];
  diagrams: string[];
  images: string[];
  keyVisuals: string[];
}> {
  const model = "claude-sonnet-4-20250514";

  const prompt = `Analyze this PDF document${context?.clientName ? ` (for client: ${context.clientName})` : ""}${context?.fileName ? ` (filename: ${context.fileName})` : ""}.

Focus on the VISUAL elements that text extraction would miss:
- Charts, graphs, and data visualizations
- Diagrams, flowcharts, and process maps
- Images, screenshots, and photos
- Tables and their data
- Logos, branding elements
- Layout and design choices that convey meaning

Provide analysis in JSON format:
{
  "visualSummary": "2-3 sentence summary of the visual story this document tells",
  "charts": ["Description of each chart/graph - what it shows, key data points, trends"],
  "diagrams": ["Description of diagrams/flowcharts - structure, relationships, flow"],
  "images": ["Description of images/photos - what they show, context"],
  "keyVisuals": ["The most important visual insights that wouldn't be captured by text alone"]
}

If this is a pitch deck or presentation:
- Describe the visual narrative arc
- Note compelling visuals vs. text-heavy slides
- Identify the "hero" visuals that tell the story

Return ONLY valid JSON, no other text.`;

  return withAILogging(
    "pdf-visual-extract",
    model,
    async () => {
      console.log(`[Vision] Starting PDF visual extraction for: ${context?.fileName || pdfUrl.slice(0, 50)}...`);

      // Fetch PDF as base64
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const { text } = await generateText({
        model: anthropic(model),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: base64,
                mimeType: "application/pdf",
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        maxTokens: 3000,
      });

      console.log(`[Vision] PDF visual response received, parsing JSON...`);

      // Strip markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      const result = JSON.parse(jsonText);
      return {
        visualSummary: result.visualSummary || "PDF visual content extracted",
        charts: result.charts || [],
        diagrams: result.diagrams || [],
        images: result.images || [],
        keyVisuals: result.keyVisuals || [],
      };
    },
    { pdfUrl: pdfUrl.slice(0, 100), fileName: context?.fileName },
    { prompt }
  ).catch((error) => {
    console.error("PDF visual extraction error:", error);
    return {
      visualSummary: "Could not extract visual content",
      charts: [],
      diagrams: [],
      images: [],
      keyVisuals: [],
    };
  });
}

/**
 * Format PDF visual extraction for combining with text content
 */
export function formatPdfVisualContentForRAG(extraction: {
  visualSummary: string;
  charts: string[];
  diagrams: string[];
  images: string[];
  keyVisuals: string[];
}): string {
  const parts: string[] = [];

  parts.push(`\n---\n## Visual Content Analysis\n`);
  parts.push(extraction.visualSummary);

  if (extraction.charts.length > 0) {
    parts.push(`\n### Charts & Graphs`);
    extraction.charts.forEach((chart, i) => {
      parts.push(`${i + 1}. ${chart}`);
    });
  }

  if (extraction.diagrams.length > 0) {
    parts.push(`\n### Diagrams & Flowcharts`);
    extraction.diagrams.forEach((diagram, i) => {
      parts.push(`${i + 1}. ${diagram}`);
    });
  }

  if (extraction.images.length > 0) {
    parts.push(`\n### Images`);
    extraction.images.forEach((image, i) => {
      parts.push(`${i + 1}. ${image}`);
    });
  }

  if (extraction.keyVisuals.length > 0) {
    parts.push(`\n### Key Visual Insights`);
    extraction.keyVisuals.forEach((insight) => {
      parts.push(`- ${insight}`);
    });
  }

  return parts.join("\n");
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
