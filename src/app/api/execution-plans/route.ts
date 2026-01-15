import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { 
  getExecutionPlans, 
  createExecutionPlan, 
  createDefaultSections 
} from "@/lib/db/execution-plans";

export const dynamic = "force-dynamic";

const createPlanSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  objective: z.string().optional(),
  timeframe: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  goal: z.string().optional(),
  successMetrics: z.object({
    quantitative: z.array(z.string()).default([]),
    qualitative: z.array(z.string()).default([]),
  }).optional(),
  sections: z.array(z.any()).optional(),
  notes: z.string().optional(),
  rules: z.array(z.string()).optional(),
  sourceSwimlanelKey: z.string().optional(),
  sourceTimeframe: z.string().optional(),
  sourceClarityCanvasId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;

    const plans = await getExecutionPlans(user.id, clientId);
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch execution plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createPlanSchema.parse(body);

    const plan = await createExecutionPlan({
      ...data,
      userId: user.id,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      sections: data.sections || createDefaultSections(),
      rules: data.rules || [],
      status: "draft",
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to create execution plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
