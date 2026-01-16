import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Prevent static caching
export const dynamic = "force-dynamic";

// GET - Get a single personal source
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const source = await db.query.sources.findFirst({
      where: and(
        eq(sources.id, id),
        eq(sources.userId, userId),
        eq(sources.isPersonal, true)
      ),
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error("Failed to fetch source:", error);
    return NextResponse.json(
      { error: "Failed to fetch source" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a personal source
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const source = await db.query.sources.findFirst({
      where: and(
        eq(sources.id, id),
        eq(sources.userId, userId),
        eq(sources.isPersonal, true)
      ),
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Delete chunks first (cascade should handle this, but being explicit)
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, id));

    // Delete the source
    await db.delete(sources).where(eq(sources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
