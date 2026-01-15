import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { updateActionItem, completeActionItem, deleteActionItem, getActionItem, getSubtasks } from "@/lib/db/action-items";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const updateActionItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  owner: z.string().optional(),
  ownerType: z.enum(["me", "client"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const includeSubtasks = searchParams.get("includeSubtasks") === "true";

    const item = await getActionItem(params.id, user.id);
    if (!item) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    const subtasks = includeSubtasks ? await getSubtasks(params.id, user.id) : [];

    return NextResponse.json({
      ...item,
      subtasks,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateActionItemSchema.parse(body);

    const item = await updateActionItem(params.id, user.id, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? undefined : undefined,
    });

    if (!item) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update action item" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();

    if (body.action === "complete") {
      const item = await completeActionItem(params.id, user.id);
      return NextResponse.json(item);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to complete action item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deleteActionItem(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete action item" }, { status: 500 });
  }
}
