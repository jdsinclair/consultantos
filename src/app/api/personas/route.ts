import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPersonas, createPersona } from "@/lib/db/personas";
import { z } from "zod";

const createPersonaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(10).default(7),
  model: z.string().default("claude-3-5-sonnet"),
  icon: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const personas = await getPersonas(user.id);
    return NextResponse.json(personas);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createPersonaSchema.parse(body);

    const persona = await createPersona({
      ...data,
      userId: user.id,
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create persona" }, { status: 500 });
  }
}
