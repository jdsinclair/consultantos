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

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

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
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    if (countOnly) {
      const count = await countPendingInsights(params.id, user.id);
      return NextResponse.json({ count });
    }

    // If status=pending with limit, return both insights and total count
    if (status === "pending" && limit) {
      const [allPending, total] = await Promise.all([
        getPendingInsights(params.id, user.id),
        countPendingInsights(params.id, user.id),
      ]);
      return NextResponse.json({
        insights: allPending.slice(0, limit),
        total,
      });
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
