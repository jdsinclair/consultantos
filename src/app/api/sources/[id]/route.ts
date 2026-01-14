import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { getSource, updateSource, deleteSource, updateSourceSummary } from "@/lib/db/sources";
import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const includeChunks = searchParams.get("includeChunks") === "true";

    const source = await db.query.sources.findFirst({
      where: and(eq(sources.id, params.id), eq(sources.userId, user.id)),
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Get chunks if requested (for debug view)
    const chunks = includeChunks
      ? await db.query.sourceChunks.findMany({
          where: eq(sourceChunks.sourceId, params.id),
          orderBy: [asc(sourceChunks.chunkIndex)],
        })
      : [];

    // Get chunk count
    const chunkCountResult = await db
      .select()
      .from(sourceChunks)
      .where(eq(sourceChunks.sourceId, params.id));

    return NextResponse.json({
      ...source,
      chunks: includeChunks ? chunks : undefined,
      chunkCount: chunkCountResult.length,
    });
  } catch (error) {
    console.error("Error fetching source:", error);
    return NextResponse.json({ error: "Failed to fetch source" }, { status: 500 });
  }
}

const updateSummarySchema = z.object({
  whatItIs: z.string(),
  whyItMatters: z.string(),
  keyInsights: z.array(z.string()),
  suggestedUses: z.array(z.string()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();

    // Check if this is an AI summary update
    if (body.aiSummary) {
      const summaryData = updateSummarySchema.parse(body.aiSummary);
      const source = await updateSourceSummary(params.id, user.id, {
        ...summaryData,
        generatedAt: body.aiSummary.generatedAt || new Date().toISOString(),
        editedAt: new Date().toISOString(),
        isEdited: true,
      });
      if (!source) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }
      return NextResponse.json(source);
    }

    // Regular source update
    const source = await updateSource(params.id, user.id, body);
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating source:", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const source = await getSource(params.id, user.id);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Delete blob if exists
    if (source.blobUrl) {
      try {
        await del(source.blobUrl);
      } catch (e) {
        console.error("Failed to delete blob:", e);
      }
    }

    await deleteSource(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
