import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClient, updateClient, deleteClient } from "@/lib/db/clients";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")).or(z.null()),
  phone: z.string().nullable().optional(),
  phoneCountryCode: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().url().optional().or(z.literal("")).or(z.null()),
  description: z.string().nullable().optional(),
  status: z.enum(["prospect", "active", "paused", "completed", "prospect_lost", "client_cancelled"]).optional(),
  color: z.string().optional(),
  dealValue: z.number().optional(),
  dealStatus: z.enum(["none", "placeholder", "presented", "active"]).optional(),
  dealNotes: z.string().optional(),
  sourceType: z.string().nullable().optional(),
  sourceNotes: z.string().nullable().optional(),
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
