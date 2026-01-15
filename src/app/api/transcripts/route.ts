import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { transcriptUploads } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const createTranscriptSchema = z.object({
  content: z.string().min(1, "Transcript content is required"),
  title: z.string().optional(),
  clientId: z.string().uuid().optional(),
  sessionDate: z.string().datetime().optional(),
  duration: z.number().optional(), // in minutes
  notes: z.string().optional(),
  sourceType: z.enum(["paste", "upload", "import"]).default("paste"),
  originalFilename: z.string().optional(),
});

/**
 * Generate a concise title from transcript content using AI
 */
async function generateTranscriptTitle(content: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-3-5-haiku-latest"),
      maxTokens: 50,
      temperature: 0.3,
      prompt: `Generate a concise title (max 8 words) for this transcript. Return ONLY the title, no explanation or quotes.

Transcript excerpt:
${content.slice(0, 2000)}`,
    });
    return text.trim().replace(/^["']|["']$/g, "");
  } catch (error) {
    console.error("Failed to generate transcript title:", error);
    // Fallback: use first meaningful words
    const firstLine = content.split("\n").find((l) => l.trim().length > 10) || "";
    return firstLine.slice(0, 50).trim() + (firstLine.length > 50 ? "..." : "") || "Untitled Transcript";
  }
}

// GET all transcript uploads for user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const conditions = [eq(transcriptUploads.userId, userId)];
    if (status) {
      conditions.push(eq(transcriptUploads.status, status));
    }
    if (clientId) {
      conditions.push(eq(transcriptUploads.clientId, clientId));
    }

    const transcripts = await db.query.transcriptUploads.findMany({
      where: and(...conditions),
      orderBy: [desc(transcriptUploads.createdAt)],
      with: {
        client: true,
        session: true,
      },
    });

    return NextResponse.json(transcripts);
  } catch (error) {
    console.error("Failed to get transcripts:", error);
    return NextResponse.json({ error: "Failed to get transcripts" }, { status: 500 });
  }
}

// POST - create new transcript upload
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createTranscriptSchema.parse(body);

    // Generate title if not provided
    const title = data.title || (await generateTranscriptTitle(data.content));

    const [transcript] = await db
      .insert(transcriptUploads)
      .values({
        userId,
        content: data.content,
        title,
        clientId: data.clientId || null,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : null,
        duration: data.duration || null,
        notes: data.notes || null,
        sourceType: data.sourceType,
        originalFilename: data.originalFilename || null,
        status: data.clientId ? "inbox" : "inbox", // Always starts in inbox
      })
      .returning();

    return NextResponse.json(transcript, { status: 201 });
  } catch (error) {
    console.error("Failed to create transcript:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create transcript" }, { status: 500 });
  }
}
