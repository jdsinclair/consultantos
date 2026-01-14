import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMethods, createMethod } from "@/lib/db/methods";
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

const createMethodSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(stepSchema).optional(),
  templates: z.record(z.string()).optional(),
  prompts: z.record(z.string()).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const methods = await getMethods(user.id);
    return NextResponse.json(methods);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createMethodSchema.parse(body);

    const method = await createMethod({
      ...data,
      userId: user.id,
    });

    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create method" }, { status: 500 });
  }
}
