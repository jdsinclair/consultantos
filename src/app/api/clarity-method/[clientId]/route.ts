import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { clarityMethodCanvases, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_CANVAS } from "@/lib/clarity-method/types";

// GET /api/clarity-method/[clientId] - Get or create canvas for client
export async function GET(
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

    // Get or create canvas
    let canvas = await db.query.clarityMethodCanvases.findFirst({
      where: and(
        eq(clarityMethodCanvases.clientId, clientId),
        eq(clarityMethodCanvases.userId, user.id)
      ),
    });

    if (!canvas) {
      // Create new canvas with defaults
      const [newCanvas] = await db.insert(clarityMethodCanvases).values({
        clientId,
        userId: user.id,
        ...DEFAULT_CANVAS,
      }).returning();
      canvas = newCanvas;
    }

    return NextResponse.json({ canvas, client });
  } catch (error) {
    console.error("Clarity Method GET error:", error);
    return NextResponse.json({ error: "Failed to fetch canvas" }, { status: 500 });
  }
}

// PATCH /api/clarity-method/[clientId] - Update canvas
export async function PATCH(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const user = await requireUser();
    const { clientId } = params;
    const updates = await req.json();

    // Verify client belongs to user
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, clientId), eq(clients.userId, user.id)),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get existing canvas
    const existing = await db.query.clarityMethodCanvases.findFirst({
      where: and(
        eq(clarityMethodCanvases.clientId, clientId),
        eq(clarityMethodCanvases.userId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    }

    // Add to history if significant change
    const history = (existing.history || []) as Array<{
      id: string;
      timestamp: string;
      changedBy: string;
      changes: string;
      snapshot?: unknown;
    }>;
    if (updates.addToHistory) {
      history.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        changedBy: updates.changedBy || 'user',
        changes: updates.historyNote || 'Updated canvas',
        snapshot: updates.snapshot,
      });
      delete updates.addToHistory;
      delete updates.changedBy;
      delete updates.historyNote;
      delete updates.snapshot;
    }

    // Update canvas
    const [updated] = await db
      .update(clarityMethodCanvases)
      .set({
        ...updates,
        history,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clarityMethodCanvases.clientId, clientId),
          eq(clarityMethodCanvases.userId, user.id)
        )
      )
      .returning();

    return NextResponse.json({ canvas: updated });
  } catch (error) {
    console.error("Clarity Method PATCH error:", error);
    return NextResponse.json({ error: "Failed to update canvas" }, { status: 500 });
  }
}
