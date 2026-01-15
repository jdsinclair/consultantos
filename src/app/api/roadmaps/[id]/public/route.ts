import { NextRequest, NextResponse } from "next/server";
import { getRoadmapPublic } from "@/lib/db/roadmaps";

export const dynamic = "force-dynamic";

// Public endpoint - no authentication required
// Used for share pages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roadmap = await getRoadmapPublic(params.id);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Failed to fetch public roadmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}
