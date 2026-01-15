import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { updatePortal, deletePortal, regeneratePortalToken } from "@/lib/db/portals";

export const dynamic = "force-dynamic";

const updatePortalSchema = z.object({
  name: z.string().optional(),
  welcomeMessage: z.string().optional(),
  brandColor: z.string().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
  regenerateToken: z.boolean().optional(),
});

// PATCH update portal settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updatePortalSchema.parse(body);

    let portal;

    if (data.regenerateToken) {
      portal = await regeneratePortalToken(params.id, user.id);
    } else {
      portal = await updatePortal(params.id, user.id, {
        name: data.name,
        welcomeMessage: data.welcomeMessage,
        brandColor: data.brandColor,
        isActive: data.isActive,
        expiresAt: data.expiresAt !== undefined
          ? (data.expiresAt ? new Date(data.expiresAt) : null)
          : undefined,
      });
    }

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Generate the share URL
    const origin = req.headers.get("host") || "";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const shareUrl = `${protocol}://${origin}/portal/${portal.accessToken}`;

    return NextResponse.json({
      portal,
      shareUrl,
    });
  } catch (error) {
    console.error("Failed to update portal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update portal" },
      { status: 500 }
    );
  }
}

// DELETE portal
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deletePortal(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete portal:", error);
    return NextResponse.json(
      { error: "Failed to delete portal" },
      { status: 500 }
    );
  }
}
