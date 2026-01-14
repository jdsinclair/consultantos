import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPersona, updatePersona, deletePersona } from "@/lib/db/personas";
import { z } from "zod";

const updatePersonaSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  temperature: z.number().min(0).max(10).optional(),
  model: z.string().optional(),
  icon: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const persona = await getPersona(params.id, user.id);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    return NextResponse.json(persona);
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
    const data = updatePersonaSchema.parse(body);

    const persona = await updatePersona(params.id, user.id, data);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found or not editable" }, { status: 404 });
    }

    return NextResponse.json(persona);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update persona" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deletePersona(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete persona" }, { status: 500 });
  }
}
