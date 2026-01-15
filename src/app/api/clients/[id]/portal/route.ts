import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { getPortalByClient, createPortal, updatePortal } from "@/lib/db/portals";

export const dynamic = "force-dynamic";

const createPortalSchema = z.object({
  name: z.string().optional(),
  welcomeMessage: z.string().optional(),
  brandColor: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
});

// GET portal for a client
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const portal = await getPortalByClient(params.id, user.id);

    if (!portal) {
      return NextResponse.json({ portal: null });
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
    console.error("Failed to fetch portal:", error);
    return NextResponse.json(
      { error: "Failed to fetch portal" },
      { status: 500 }
    );
  }
}

// POST create a new portal for this client
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createPortalSchema.parse(body);

    const portal = await createPortal(params.id, user.id, {
      name: data.name,
      welcomeMessage: data.welcomeMessage,
      brandColor: data.brandColor,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    // Generate the share URL
    const origin = req.headers.get("host") || "";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const shareUrl = `${protocol}://${origin}/portal/${portal.accessToken}`;

    return NextResponse.json({
      portal,
      shareUrl,
    });
  } catch (error) {
    console.error("Failed to create portal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create portal" },
      { status: 500 }
    );
  }
}
