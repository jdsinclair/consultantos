import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const conditions = [eq(sources.userId, user.id)];
    if (status && status !== "all") {
      conditions.push(eq(sources.processingStatus, status));
    }

    const allSources = await db.query.sources.findMany({
      where: and(...conditions),
      orderBy: [desc(sources.createdAt)],
      with: {
        client: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate stats
    const allUserSources = await db.query.sources.findMany({
      where: eq(sources.userId, user.id),
    });

    const stats = {
      total: allUserSources.length,
      pending: allUserSources.filter((s) => s.processingStatus === "pending").length,
      processing: allUserSources.filter((s) => s.processingStatus === "processing").length,
      completed: allUserSources.filter((s) => s.processingStatus === "completed").length,
      error: allUserSources.filter(
        (s) => s.processingStatus === "error" || s.processingStatus === "failed"
      ).length,
    };

    return NextResponse.json({
      sources: allSources,
      stats,
    });
  } catch (error) {
    console.error("Debug sources error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
