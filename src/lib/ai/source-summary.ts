import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { SourceAISummary } from "@/db/schema";

/**
 * Generate an AI summary for a source document
 */
export async function generateSourceSummary(
  content: string,
  context: {
    fileName?: string;
    fileType?: string;
    clientName?: string;
    sourceType?: string;
  }
): Promise<SourceAISummary> {
  try {
    // Truncate content if too long (keep first and last parts for context)
    const maxContentLength = 15000;
    let truncatedContent = content;
    if (content.length > maxContentLength) {
      const half = Math.floor(maxContentLength / 2);
      truncatedContent = content.slice(0, half) + "\n\n[...content truncated...]\n\n" + content.slice(-half);
    }

    const prompt = `Analyze this ${context.sourceType || "document"}${context.clientName ? ` for client "${context.clientName}"` : ""}:

${context.fileName ? `File: ${context.fileName}` : ""}
${context.fileType ? `Type: ${context.fileType}` : ""}

Content:
${truncatedContent}

Provide a consulting-focused analysis in JSON format:
{
  "whatItIs": "Brief description of what this document is (1-2 sentences)",
  "whyItMatters": "Why this is relevant for consulting this client (1-2 sentences)",
  "keyInsights": ["Array of 3-5 key insights or important points from this document"],
  "suggestedUses": ["Array of 2-4 ways this could be used in consulting sessions or strategy"]
}

Focus on actionable insights for a consultant. Return ONLY valid JSON.`;

    const { text } = await generateText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt,
      maxTokens: 1500,
    });

    const result = JSON.parse(text);

    return {
      whatItIs: result.whatItIs || "Document uploaded for reference",
      whyItMatters: result.whyItMatters || "Added to client knowledge base",
      keyInsights: result.keyInsights || [],
      suggestedUses: result.suggestedUses || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Source summary generation error:", error);
    return {
      whatItIs: "Document content available for reference",
      whyItMatters: "Added to client knowledge base for RAG queries",
      keyInsights: [],
      suggestedUses: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate a title for a note based on its content
 */
export async function generateNoteTitle(content: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      prompt: `Generate a concise, descriptive title (5-10 words max) for this note:

${content.slice(0, 1000)}

Return ONLY the title, nothing else.`,
      maxTokens: 100,
    });

    return text.trim().replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Note title generation error:", error);
    return "Untitled Note";
  }
}

/**
 * Generate an AI-friendly name for an uploaded file based on its content
 */
export async function generateSourceName(
  content: string,
  context: {
    originalFileName: string;
    fileType?: string;
    clientName?: string;
  }
): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      prompt: `Generate a clear, descriptive name (3-8 words) for this uploaded document.

Original filename: ${context.originalFileName}
${context.fileType ? `File type: ${context.fileType}` : ""}
${context.clientName ? `Client: ${context.clientName}` : ""}

Content preview:
${content.slice(0, 2000)}

Create a name that describes WHAT this document is (e.g., "Q3 2024 Financial Report", "Product Roadmap Overview", "Brand Guidelines Document", "Competitor Analysis - Acme Corp").

Return ONLY the name, nothing else. Do not include file extensions.`,
      maxTokens: 100,
    });

    return text.trim().replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Source name generation error:", error);
    // Fall back to original filename without extension
    return context.originalFileName.replace(/\.[^/.]+$/, "");
  }
}
