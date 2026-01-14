import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMethod, updateMethod, deleteMethod } from "@/lib/db/methods";
import { z } from "zod";

const stepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  duration: z.number().optional(),
  prompts: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
});

const updateMethodSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(stepSchema).optional(),
  templates: z.record(z.string()).optional(),
  prompts: z.record(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const method = await getMethod(params.id, user.id);

    if (!method) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    return NextResponse.json(method);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateMethodSchema.parse(body);

    const method = await updateMethod(params.id, user.id, data);

    if (!method) {
      return NextResponse.json({ error: "Method not found or not editable" }, { status: 404 });
    }

    return NextResponse.json(method);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update method" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deleteMethod(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete method" }, { status: 500 });
  }
}
