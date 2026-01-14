import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { updateFieldStatus } from "@/lib/db/clarity";
import { z } from "zod";

const updateSchema = z.object({
  fieldName: z.string().min(1),
  status: z.enum(["draft", "confirmed", "locked"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { fieldName, status } = updateSchema.parse(body);

    const doc = await updateFieldStatus(params.id, user.id, fieldName, status);
    return NextResponse.json(doc);
  } catch (error) {
    console.error("Failed to update field status:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update field status" },
      { status: 500 }
    );
  }
}
