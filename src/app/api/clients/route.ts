import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClients, createClient } from "@/lib/db/clients";
import { z } from "zod";

const createClientSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  status: z.enum(["prospect", "active", "paused", "completed"]).default("active"),
  color: z.string().optional(),
  sourceType: z.string().optional(),
  sourceNotes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const clients = await getClients(user.id, status || undefined);
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createClientSchema.parse(body);

    const client = await createClient({
      ...data,
      userId: user.id,
      website: data.website || undefined,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
