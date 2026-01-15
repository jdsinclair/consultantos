import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { inboundEmails, sources } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// GET all inbound emails for user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const conditions = [eq(inboundEmails.userId, userId)];
    if (status) {
      conditions.push(eq(inboundEmails.status, status));
    }
    if (clientId) {
      conditions.push(eq(inboundEmails.clientId, clientId));
    }

    const emails = await db.query.inboundEmails.findMany({
      where: and(...conditions),
      orderBy: [desc(inboundEmails.createdAt)],
      with: {
        client: true,
      },
    });

    return NextResponse.json(emails);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get emails" }, { status: 500 });
  }
}
