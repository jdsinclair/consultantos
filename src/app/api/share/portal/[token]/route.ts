import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";
import { getPortalByToken, logPortalAccess } from "@/lib/db/portals";
import { getExecutionPlanPublic } from "@/lib/db/execution-plans";
import { db } from "@/db";
import { clarityMethodCanvases, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public endpoint - get portal data by access token
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Disable ALL caching - Vercel Data Cache was returning stale DB results
  unstable_noStore();
  
  try {
    const portal = await getPortalByToken(params.token);

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    // Log access
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    await logPortalAccess(
      portal.id,
      "portal_view",
      undefined,
      ipAddress,
      userAgent
    );

    // Fetch actual item data for each shared item
    const itemsWithData = await Promise.all(
      portal.sharedItems.map(async (item) => {
        let itemData = null;

        if (item.itemType === "execution_plan") {
          itemData = await getExecutionPlanPublic(item.itemId);
        } else if (item.itemType === "clarity_canvas") {
          const canvas = await db.query.clarityMethodCanvases.findFirst({
            where: eq(clarityMethodCanvases.clientId, item.itemId),
            with: {
              client: {
                columns: {
                  id: true,
                  name: true,
                  company: true,
                },
              },
            },
          });
          itemData = canvas;
        }

        return {
          ...item,
          data: itemData,
        };
      })
    );

    return NextResponse.json({
      portal: {
        id: portal.id,
        name: portal.name,
        welcomeMessage: portal.welcomeMessage,
        brandColor: portal.brandColor,
        client: portal.client,
      },
      items: itemsWithData,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Failed to fetch portal:", error);
    return NextResponse.json(
      { error: "Failed to fetch portal" },
      { status: 500 }
    );
  }
}
