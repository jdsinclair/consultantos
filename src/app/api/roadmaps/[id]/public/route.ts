import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore } from "next/cache";
import { getRoadmapPublic } from "@/lib/db/roadmaps";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public endpoint - no authentication required
// Used for share pages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Prevent any caching
  unstable_noStore();

  try {
    const roadmap = await getRoadmapPublic(params.id);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Return with no-cache headers
    return NextResponse.json(roadmap, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Failed to fetch public roadmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}
