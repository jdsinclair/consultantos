import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { sources, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const allSources = await db
      .select({
        id: sources.id,
        name: sources.name,
        type: sources.type,
        url: sources.url,
        blobUrl: sources.blobUrl,
        fileType: sources.fileType,
        fileSize: sources.fileSize,
        processingStatus: sources.processingStatus,
        processingError: sources.processingError,
        createdAt: sources.createdAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(sources)
      .leftJoin(clients, eq(sources.clientId, clients.id))
      .where(eq(sources.userId, user.id))
      .orderBy(desc(sources.createdAt));

    return NextResponse.json(allSources);
  } catch (error) {
    console.error("Failed to fetch sources:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
