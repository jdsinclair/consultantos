import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { pushCanvasToRAG } from "@/lib/clarity-method/rag-integration";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// POST /api/clarity-method/[clientId]/sync-rag - Manually trigger RAG sync
export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const user = await requireUser();
    const { clientId } = params;

    // Verify client belongs to user
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.userId, user.id)),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Push canvas to RAG
    const result = await pushCanvasToRAG(clientId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to sync with RAG" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sourceId: result.sourceId,
      message: result.sourceId
        ? "Canvas successfully indexed in RAG"
        : "Canvas has no content to index",
    });
  } catch (error) {
    console.error("Clarity Method RAG sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync canvas with RAG" },
      { status: 500 }
    );
  }
}
