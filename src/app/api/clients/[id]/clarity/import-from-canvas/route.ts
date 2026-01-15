import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { clarityMethodCanvases, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateClarityInsightsFromCanvas, canvasHasClarityContent } from "@/lib/ai/clarity-insights";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// POST /api/clients/[id]/clarity/import-from-canvas
// Triggers insight generation from the Clarity Method canvas
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const clientId = params.id;

    // Get client
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.userId, user.id)),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get canvas
    const canvas = await db.query.clarityMethodCanvases.findFirst({
      where: and(
        eq(clarityMethodCanvases.clientId, clientId),
        eq(clarityMethodCanvases.userId, user.id)
      ),
    });

    if (!canvas) {
      return NextResponse.json({ error: "No Clarity Method canvas found for this client" }, { status: 404 });
    }

    if (!canvas.strategicTruth || !canvasHasClarityContent(canvas.strategicTruth)) {
      return NextResponse.json({ error: "Canvas has no Strategic Truth content to import" }, { status: 400 });
    }

    // Generate insights from canvas
    const result = await generateClarityInsightsFromCanvas(canvas.strategicTruth, {
      canvasId: canvas.id,
      clientId,
      userId: user.id,
      clientName: client.name,
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      message: result.created > 0
        ? `Created ${result.created} new insight${result.created !== 1 ? 's' : ''} from Clarity Method`
        : "No new insights to import (already up to date)",
    });
  } catch (error) {
    console.error("Import from canvas error:", error);
    return NextResponse.json({ error: "Failed to import from canvas" }, { status: 500 });
  }
}
