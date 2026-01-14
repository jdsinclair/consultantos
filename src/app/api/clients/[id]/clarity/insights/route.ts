import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getPendingInsights,
  getAllInsights,
  acceptInsight,
  rejectInsight,
  deferInsight,
  countPendingInsights,
} from "@/lib/db/clarity";
import { z } from "zod";

// Get all pending insights (or all insights with ?all=true)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "true";
    const countOnly = searchParams.get("count") === "true";

    if (countOnly) {
      const count = await countPendingInsights(params.id, user.id);
      return NextResponse.json({ count });
    }

    const insights = includeAll
      ? await getAllInsights(params.id, user.id)
      : await getPendingInsights(params.id, user.id);

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Failed to get insights:", error);
    return NextResponse.json(
      { error: "Failed to get insights" },
      { status: 500 }
    );
  }
}

const actionSchema = z.object({
  insightId: z.string().uuid(),
  action: z.enum(["accept", "reject", "defer"]),
});

// Handle insight actions (accept/reject/defer)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { insightId, action } = actionSchema.parse(body);

    let result;
    switch (action) {
      case "accept":
        result = await acceptInsight(insightId, user.id);
        break;
      case "reject":
        result = await rejectInsight(insightId, user.id);
        break;
      case "defer":
        result = await deferInsight(insightId, user.id);
        break;
    }

    if (!result) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to process insight action:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to process insight action" },
      { status: 500 }
    );
  }
}
