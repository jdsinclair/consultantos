import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSources } from "@/lib/db/sources";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const sources = await getSources(params.id, user.id);
    return NextResponse.json(sources);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
