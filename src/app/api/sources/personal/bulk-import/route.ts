import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { processSourceEmbeddings } from "@/lib/rag";

// Prevent static caching
export const dynamic = "force-dynamic";

// Type definitions for import formats
interface NewsletterItem {
  slug: string;
  title: string;
  date?: string;
  coreTakeaway?: string;
  tldr?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  body?: string;
}

interface FrameworkItem {
  moduleCode?: string;
  title: string;
  slug?: string;
  introText?: string;
  whatYoulearn?: string;
  tldr?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  paaFaqs?: Array<{ question: string; answer: string }>;
  mythsSection?: {
    title?: string;
    intro?: string;
    points?: string[];
  };
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build searchable content from a newsletter item
 */
function buildNewsletterContent(item: NewsletterItem): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${item.title}`);
  if (item.date) {
    parts.push(`Date: ${item.date}`);
  }

  // Core takeaway
  if (item.coreTakeaway) {
    parts.push(`\n## Core Takeaway\n${item.coreTakeaway}`);
  }

  // TL;DR
  if (item.tldr && item.tldr.length > 0) {
    parts.push(`\n## Key Points`);
    item.tldr.forEach((point) => {
      parts.push(`- ${point}`);
    });
  }

  // Body content (stripped of HTML)
  if (item.body) {
    const cleanBody = stripHtml(item.body);
    parts.push(`\n## Full Content\n${cleanBody}`);
  }

  // FAQs
  if (item.faqs && item.faqs.length > 0) {
    parts.push(`\n## FAQs`);
    item.faqs.forEach((faq) => {
      parts.push(`\nQ: ${faq.question}\nA: ${faq.answer}`);
    });
  }

  return parts.join("\n");
}

/**
 * Build searchable content from a framework item
 */
function buildFrameworkContent(item: FrameworkItem): string {
  const parts: string[] = [];

  // Title with module code
  const title = item.moduleCode
    ? `# ${item.moduleCode} - ${item.title}`
    : `# ${item.title}`;
  parts.push(title);

  // Intro text
  if (item.introText) {
    parts.push(`\n## Overview\n${item.introText}`);
  }

  // What you'll learn
  if (item.whatYoulearn) {
    parts.push(`\n## What You'll Learn\n${item.whatYoulearn}`);
  }

  // Myths section
  if (item.mythsSection) {
    parts.push(`\n## ${item.mythsSection.title || "Myths & False Signals"}`);
    if (item.mythsSection.intro) {
      parts.push(item.mythsSection.intro);
    }
    if (item.mythsSection.points && item.mythsSection.points.length > 0) {
      item.mythsSection.points.forEach((point) => {
        parts.push(`- ${point}`);
      });
    }
  }

  // TL;DR / Key takeaways
  if (item.tldr && item.tldr.length > 0) {
    parts.push(`\n## Key Takeaways`);
    item.tldr.forEach((point) => {
      parts.push(`- ${point}`);
    });
  }

  // FAQs
  if (item.faqs && item.faqs.length > 0) {
    parts.push(`\n## FAQs`);
    item.faqs.forEach((faq) => {
      parts.push(`\nQ: ${faq.question}\nA: ${faq.answer}`);
    });
  }

  // PAA FAQs (People Also Ask)
  if (item.paaFaqs && item.paaFaqs.length > 0) {
    parts.push(`\n## Additional Questions`);
    item.paaFaqs.forEach((faq) => {
      parts.push(`\nQ: ${faq.question}\nA: ${faq.answer}`);
    });
  }

  return parts.join("\n");
}

// POST - Bulk import JSON array
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, type } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    if (!type || !["newsletter", "framework"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'newsletter' or 'framework'" },
        { status: 400 }
      );
    }

    const results: Array<{ name: string; status: string; id?: string; error?: string }> = [];
    const createdSourceIds: string[] = [];

    // Process each item
    for (const item of items) {
      try {
        let name: string;
        let content: string;

        if (type === "newsletter") {
          const newsletter = item as NewsletterItem;
          name = newsletter.title || newsletter.slug || "Untitled Newsletter";
          content = buildNewsletterContent(newsletter);
        } else {
          const framework = item as FrameworkItem;
          name = framework.moduleCode
            ? `${framework.moduleCode} - ${framework.title}`
            : framework.title || "Untitled Framework";
          content = buildFrameworkContent(framework);
        }

        // Create the source
        const [newSource] = await db
          .insert(sources)
          .values({
            userId,
            clientId: null,
            name,
            type: "document",
            content,
            isPersonal: true,
            personalCategory: type,
            processingStatus: "pending",
          })
          .returning();

        createdSourceIds.push(newSource.id);
        results.push({ name, status: "created", id: newSource.id });
      } catch (itemError) {
        const itemName = type === "newsletter"
          ? (item as NewsletterItem).title
          : (item as FrameworkItem).title;
        results.push({
          name: itemName || "Unknown",
          status: "error",
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }

    // Start background processing for all created sources
    // Don't await - let it run in background
    processSourcesInBackground(createdSourceIds, userId).catch((err) =>
      console.error("[Bulk Import] Background processing error:", err)
    );

    return NextResponse.json({
      success: true,
      total: items.length,
      created: results.filter((r) => r.status === "created").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
      message: `Created ${results.filter((r) => r.status === "created").length} sources. Processing embeddings in background.`,
    });
  } catch (error) {
    console.error("Bulk import failed:", error);
    return NextResponse.json(
      { error: "Failed to process bulk import" },
      { status: 500 }
    );
  }
}

/**
 * Process embeddings for multiple sources in background
 */
async function processSourcesInBackground(
  sourceIds: string[],
  userId: string
): Promise<void> {
  console.log(`[Bulk Import] Starting background processing for ${sourceIds.length} sources`);

  for (let i = 0; i < sourceIds.length; i++) {
    const sourceId = sourceIds[i];
    console.log(`[Bulk Import] Processing ${i + 1}/${sourceIds.length}: ${sourceId}`);

    try {
      // Update status to processing
      await db
        .update(sources)
        .set({ processingStatus: "processing" })
        .where(eq(sources.id, sourceId));

      // Process embeddings
      await processSourceEmbeddings(sourceId, null, userId, true);

      // Mark as completed
      await db
        .update(sources)
        .set({ processingStatus: "completed" })
        .where(eq(sources.id, sourceId));

      console.log(`[Bulk Import] Completed ${i + 1}/${sourceIds.length}: ${sourceId}`);
    } catch (error) {
      console.error(`[Bulk Import] Failed ${sourceId}:`, error);

      // Mark as failed
      await db
        .update(sources)
        .set({
          processingStatus: "failed",
          processingError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(sources.id, sourceId));
    }

    // Small delay between items to avoid rate limits
    if (i < sourceIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`[Bulk Import] Background processing complete for ${sourceIds.length} sources`);
}

// Need to import eq for the update queries
import { eq } from "drizzle-orm";
