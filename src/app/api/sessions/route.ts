import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSessions, createSession, getUpcomingSessions, getLiveSession } from "@/lib/db/sessions";
import { z } from "zod";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

const createSessionSchema = z.object({
  clientId: z.string().uuid(),
  methodId: z.string().uuid().optional(),
  title: z.string().min(1),
  gameplan: z.array(z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
    order: z.number(),
  })).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const filter = searchParams.get("filter");

    if (filter === "upcoming") {
      const sessions = await getUpcomingSessions(user.id);
      return NextResponse.json(sessions);
    }

    if (filter === "live") {
      const session = await getLiveSession(user.id);
      return NextResponse.json(session);
    }

    const sessions = await getSessions(user.id, clientId || undefined);
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createSessionSchema.parse(body);

    const session = await createSession({
      ...data,
      userId: user.id,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
