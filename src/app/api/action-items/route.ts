import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getActionItems, createActionItem, getOverdueActionItems } from "@/lib/db/action-items";
import { z } from "zod";

const createActionItemSchema = z.object({
  clientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  ownerType: z.enum(["me", "client"]).default("me"),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const filter = searchParams.get("filter");

    if (filter === "overdue") {
      const items = await getOverdueActionItems(user.id);
      return NextResponse.json(items);
    }

    const items = await getActionItems(user.id, {
      clientId: clientId || undefined,
      status: status || undefined,
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createActionItemSchema.parse(body);

    const item = await createActionItem({
      ...data,
      userId: user.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create action item" }, { status: 500 });
  }
}
