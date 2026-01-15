import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { clarityMethodCanvases, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// GET /api/clarity-method - List all canvases for the user
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");

    const canvases = await db.query.clarityMethodCanvases.findMany({
      where: eq(clarityMethodCanvases.userId, user.id),
      orderBy: [desc(clarityMethodCanvases.updatedAt)],
      limit: limit ? parseInt(limit, 10) : undefined,
      with: {
        client: true,
      },
    });

    // Transform to include useful client info and canvas status
    const result = canvases.map((canvas) => ({
      clientId: canvas.clientId,
      clientName: canvas.client?.name || "Unknown",
      phase: canvas.phase,
      updatedAt: canvas.updatedAt,
      hasStrategicTruth: !!(
        canvas.strategicTruth?.whoWeAre?.value ||
        canvas.strategicTruth?.whatWeDo?.value ||
        canvas.strategicTruth?.theWedge?.value
      ),
      hasPrimaryConstraint: !!canvas.coreEngine?.primaryConstraint,
      hasStrategy: !!(
        canvas.strategy?.core ||
        canvas.strategy?.expansion
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("List clarity method canvases error:", error);
    return NextResponse.json({ error: "Failed to list canvases" }, { status: 500 });
  }
}
