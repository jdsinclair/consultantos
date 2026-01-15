import { NextRequest, NextResponse } from "next/server";
import { getExecutionPlanPublic } from "@/lib/db/execution-plans";

export const dynamic = "force-dynamic";

// Public endpoint for share pages - no authentication required
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await getExecutionPlanPublic(params.id);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to fetch shared plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
