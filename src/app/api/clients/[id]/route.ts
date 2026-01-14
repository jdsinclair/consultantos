import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClient, updateClient, deleteClient } from "@/lib/db/clients";
import { z } from "zod";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  color: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const client = await getClient(params.id, user.id);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
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
    const data = updateClientSchema.parse(body);

    const client = await updateClient(params.id, user.id, data);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await deleteClient(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
