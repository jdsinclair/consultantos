import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import {
  getSharedItemsByPortal,
  addSharedItem,
  updateSharedItem,
  removeSharedItem,
} from "@/lib/db/portals";

export const dynamic = "force-dynamic";

const addItemSchema = z.object({
  itemType: z.enum(["execution_plan", "clarity_canvas", "roadmap", "source", "note"]),
  itemId: z.string().uuid(),
  displayName: z.string().optional(),
});

const updateItemSchema = z.object({
  displayName: z.string().optional(),
  displayOrder: z.number().optional(),
  isVisible: z.boolean().optional(),
});

// GET all shared items in a portal
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const items = await getSharedItemsByPortal(params.id);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch shared items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

// POST add a new shared item
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = addItemSchema.parse(body);

    const item = await addSharedItem(
      params.id,
      user.id,
      data.itemType,
      data.itemId,
      data.displayName
    );

    // Generate deep link URL
    const origin = req.headers.get("host") || "";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const deepLinkUrl = `${protocol}://${origin}/share/${item.deepLinkToken}`;

    return NextResponse.json({
      item,
      deepLinkUrl,
    });
  } catch (error) {
    console.error("Failed to add shared item:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}

// PATCH update shared item
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = updateItemSchema.parse(body);

    const item = await updateSharedItem(itemId, user.id, data);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update shared item:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE remove shared item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    await removeSharedItem(itemId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove shared item:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
