import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { processSourceEmbeddings } from "@/lib/rag";

// Prevent static caching
export const dynamic = "force-dynamic";

// GET - List all personal sources for the user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const personalSources = await db.query.sources.findMany({
      where: and(
        eq(sources.userId, userId),
        eq(sources.isPersonal, true)
      ),
      orderBy: (sources, { desc }) => [desc(sources.createdAt)],
    });

    return NextResponse.json(personalSources);
  } catch (error) {
    console.error("Failed to fetch personal sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

// POST - Create a new personal source
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, category, url, content } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the source
    const [newSource] = await db
      .insert(sources)
      .values({
        userId,
        clientId: null, // Personal source - no client
        name,
        type: type || "document",
        url: url || null,
        content: content || null,
        isPersonal: true,
        personalCategory: category || "other",
        processingStatus: content || url ? "pending" : "completed",
      })
      .returning();

    // If there's content or URL, process embeddings in background
    if ((content || url) && newSource) {
      // Update to processing
      await db
        .update(sources)
        .set({ processingStatus: "processing" })
        .where(eq(sources.id, newSource.id));

      // Process in background (don't await)
      processSourceWithEmbeddings(newSource.id, userId, content, url).catch(
        (err) => console.error("Background processing failed:", err)
      );
    }

    return NextResponse.json(newSource);
  } catch (error) {
    console.error("Failed to create personal source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}

// Background processing function
async function processSourceWithEmbeddings(
  sourceId: string,
  userId: string,
  content: string | null,
  url: string | null
) {
  try {
    let textContent = content;

    // If URL provided, fetch content
    if (url && !content) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          textContent = await response.text();
          // Basic HTML stripping (in production, use proper HTML parser)
          textContent = textContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
      } catch (err) {
        console.error("Failed to fetch URL content:", err);
      }
    }

    if (textContent) {
      // Update content in source
      await db
        .update(sources)
        .set({ content: textContent })
        .where(eq(sources.id, sourceId));

      // Process embeddings - pass null for clientId since it's a personal source
      await processSourceEmbeddings(sourceId, null, userId, true);
    }

    // Mark as completed
    await db
      .update(sources)
      .set({ processingStatus: "completed" })
      .where(eq(sources.id, sourceId));
  } catch (error) {
    console.error("Embedding processing failed:", error);
    // Mark as failed
    await db
      .update(sources)
      .set({
        processingStatus: "failed",
        processingError: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(sources.id, sourceId));
  }
}
