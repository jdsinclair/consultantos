import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { 
  getExecutionPlan, 
  updateExecutionPlan, 
  deleteExecutionPlan 
} from "@/lib/db/execution-plans";

export const dynamic = "force-dynamic";

// Transform old status values to new ones for backward compatibility
const normalizeStatus = (status: string | undefined): string | undefined => {
  if (!status) return undefined;
  const statusMap: Record<string, string> = {
    'in_progress': 'active',
    'not_started': 'draft',
    'done': 'completed',
    'blocked': 'active', // treat blocked as active
  };
  return statusMap[status] || status;
};

// Initiative (section) schema with full metadata support
// Accepts both old and new status values, transforms old to new
const initiativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string().optional(),
  goal: z.string().optional(),
  successMetrics: z.object({
    quantitative: z.array(z.string()),
    qualitative: z.array(z.string()),
  }).optional(),
  rules: z.array(z.string()).optional(),
  why: z.string().optional(),
  what: z.string().optional(),
  notes: z.string().optional(),
  // Accept any string status, transform old values to new
  status: z.string().optional().transform(normalizeStatus),
  items: z.array(z.any()), // Items can be nested
  order: z.number(),
  collapsed: z.boolean().optional(),
});

const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  objective: z.string().optional(),
  timeframe: z.string().optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  goal: z.string().optional(),
  successMetrics: z.object({
    quantitative: z.array(z.string()),
    qualitative: z.array(z.string()),
  }).optional(),
  sections: z.array(initiativeSchema).optional(),  // Now properly typed
  notes: z.string().optional(),
  rules: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const plan = await getExecutionPlan(params.id, user.id);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to fetch execution plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    
    // Handle date conversions
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.targetDate !== undefined) {
      updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
    }

    const plan = await updateExecutionPlan(params.id, user.id, updateData);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to update execution plan:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deleteExecutionPlan(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete execution plan:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
