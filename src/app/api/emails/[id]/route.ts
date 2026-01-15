import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { inboundEmails, sources } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

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

    const {
      action,
      clientId,
      // RAG context options
      excludeFromRag = false,
      sourceCategory, // competitor_info, client_docs, internal, reference, etc.
      excludeReason, // notes on why excluded from RAG
      // Per-attachment exclusion overrides
      attachmentOverrides, // { [attachmentId]: { excludeFromRag: boolean, sourceCategory: string } }
    } = await req.json();

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
            emailId: email.id,
          },
          // RAG control - exclude email body if flagged
          excludeFromRag,
          sourceCategory,
          excludeReason,
          // Skip processing if excluded from RAG (no need to embed)
          processingStatus: excludeFromRag ? "completed" : "completed",
        })
        .returning();

      // Track added attachment sources
      const attachmentSources: Array<{ filename: string; sourceId: string; excludeFromRag: boolean }> = [];

      // Add attachments as separate sources
      if (email.attachments && Array.isArray(email.attachments)) {
        for (const attachment of email.attachments as Array<{
          id: string;
          filename: string;
          blobUrl?: string;
          contentType: string;
          size: number;
        }>) {
          if (attachment.blobUrl) {
            // Check for per-attachment override
            const override = attachmentOverrides?.[attachment.id];
            const attExcludeFromRag = override?.excludeFromRag ?? excludeFromRag;
            const attSourceCategory = override?.sourceCategory ?? sourceCategory;
            const attExcludeReason = override?.excludeReason ?? excludeReason;

            const [attSource] = await db.insert(sources).values({
              clientId,
              userId,
              type: "document",
              name: attachment.filename,
              blobUrl: attachment.blobUrl,
              fileType: attachment.contentType.split("/")[1],
              fileSize: attachment.size,
              metadata: {
                fromEmail: email.fromEmail,
                emailSubject: email.subject,
                emailId: email.id,
              },
              // RAG control for attachment
              excludeFromRag: attExcludeFromRag,
              sourceCategory: attSourceCategory,
              excludeReason: attExcludeReason,
              // Set to pending for processing unless excluded from RAG
              processingStatus: attExcludeFromRag ? "completed" : "pending",
            }).returning();

            attachmentSources.push({
              filename: attachment.filename,
              sourceId: attSource.id,
              excludeFromRag: attExcludeFromRag,
            });
          }
        }
      }

      // Update email with processing context
      await db
        .update(inboundEmails)
        .set({
          clientId,
          status: "processed",
          sourceCategory,
          excludeFromRag,
          contextNotes: excludeReason,
          processedAt: new Date(),
        })
        .where(eq(inboundEmails.id, params.id));

      return NextResponse.json({
        success: true,
        sourceId: source.id,
        attachmentSources,
        excludeFromRag,
        sourceCategory,
      });
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
