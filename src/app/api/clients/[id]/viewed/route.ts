import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { markClientViewed } from "@/lib/db/clients";

// POST /api/clients/[id]/viewed - Mark a client/prospect as viewed
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const client = await markClientViewed(params.id, user.id);

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, viewedAt: client.viewedAt });
  } catch (error) {
    console.error("Mark viewed error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
