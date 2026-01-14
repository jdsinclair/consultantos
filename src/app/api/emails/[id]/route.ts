import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { inboundEmails, sources } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET single email
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = await db.query.inboundEmails.findFirst({
      where: and(
        eq(inboundEmails.id, params.id),
        eq(inboundEmails.userId, userId)
      ),
      with: {
        client: true,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get email" }, { status: 500 });
  }
}

// PATCH - update email (assign to client, update status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const [email] = await db
      .update(inboundEmails)
      .set({
        ...body,
        processedAt: body.status === "processed" ? new Date() : undefined,
      })
      .where(
        and(eq(inboundEmails.id, params.id), eq(inboundEmails.userId, userId))
      )
      .returning();

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}

// POST - process email action (add to client sources, create conversation, etc.)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, clientId } = await req.json();

    const email = await db.query.inboundEmails.findFirst({
      where: and(
        eq(inboundEmails.id, params.id),
        eq(inboundEmails.userId, userId)
      ),
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (action === "add_to_sources" && clientId) {
      // Add email content as a source
      const [source] = await db
        .insert(sources)
        .values({
          clientId,
          userId,
          type: "email",
          name: email.subject || "Email from " + email.fromEmail,
          content: email.bodyText || "",
          metadata: {
            from: email.fromEmail,
            subject: email.subject,
            date: email.createdAt,
          },
          processingStatus: "completed",
        })
        .returning();

      // Add attachments as separate sources
      if (email.attachments && Array.isArray(email.attachments)) {
        for (const attachment of email.attachments as Array<{
          filename: string;
          blobUrl?: string;
          contentType: string;
          size: number;
        }>) {
          if (attachment.blobUrl) {
            await db.insert(sources).values({
              clientId,
              userId,
              type: "document",
              name: attachment.filename,
              blobUrl: attachment.blobUrl,
              fileType: attachment.contentType.split("/")[1],
              fileSize: attachment.size,
              processingStatus: "pending",
            });
          }
        }
      }

      // Update email status
      await db
        .update(inboundEmails)
        .set({
          clientId,
          status: "processed",
          processedAt: new Date(),
        })
        .where(eq(inboundEmails.id, params.id));

      return NextResponse.json({ success: true, sourceId: source.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Email action error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}

// DELETE email
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .delete(inboundEmails)
      .where(
        and(eq(inboundEmails.id, params.id), eq(inboundEmails.userId, userId))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
