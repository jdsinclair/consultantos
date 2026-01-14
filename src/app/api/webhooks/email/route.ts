import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { users, inboundEmails, clients } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { extractTodosFromEmail } from "@/lib/ai/extract-todos";
import { createActionItem } from "@/lib/db/action-items";

// Webhook endpoint for receiving emails from Cloudflare Email Worker
export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const secret = req.headers.get("x-webhook-secret");
    if (!process.env.EMAIL_WEBHOOK_SECRET || secret !== process.env.EMAIL_WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse JSON payload from CF Worker
    const payload = await req.json();
    const {
      to,
      from,
      fromName,
      fromEmail,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
      attachments = [],
    } = payload;

    // Find user by ingest email address
    const user = await db.query.users.findFirst({
      where: eq(users.ingestEmail, to.toLowerCase()),
    });

    if (!user) {
      console.error(`No user found for ingest email: ${to}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Process attachments - upload to Vercel Blob
    const processedAttachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      blobUrl?: string;
    }> = [];

    for (const att of attachments) {
      try {
        if (att.content) {
          // Decode base64 content
          const buffer = Buffer.from(att.content, "base64");

          // Upload to Vercel Blob
          const blob = await put(
            `emails/${user.id}/${Date.now()}-${att.filename}`,
            buffer,
            { access: "public", contentType: att.contentType }
          );

          processedAttachments.push({
            id: `att-${Date.now()}-${processedAttachments.length}`,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            blobUrl: blob.url,
          });
        }
      } catch (attachError) {
        console.error(`Failed to process attachment ${att.filename}:`, attachError);
        // Still record the attachment metadata even if upload fails
        processedAttachments.push({
          id: `att-${Date.now()}-${processedAttachments.length}`,
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
        });
      }
    }

    // Create inbound email record
    const [email] = await db
      .insert(inboundEmails)
      .values({
        userId: user.id,
        fromEmail: fromEmail || from,
        fromName: fromName,
        toEmail: to,
        subject,
        bodyText: text,
        bodyHtml: html,
        attachments: processedAttachments,
        messageId,
        inReplyTo,
        rawHeaders: payload.headers,
        status: "inbox",
      })
      .returning();

    // Try to auto-match to a client based on sender email domain
    const senderDomain = (fromEmail || from).split("@")[1]?.toLowerCase();
    if (senderDomain) {
      // Look for clients with matching website domain
      const matchingClient = await db.query.clients.findFirst({
        where: ilike(clients.website, `%${senderDomain}%`),
      });

      if (matchingClient && matchingClient.userId === user.id) {
        await db
          .update(inboundEmails)
          .set({ clientId: matchingClient.id })
          .where(eq(inboundEmails.id, email.id));
      }
    }

    // Extract TODOs from email in background
    if (text) {
      extractTodosFromEmail({
        from: fromEmail || from,
        subject: subject || "",
        body: text,
      })
        .then(async (todos) => {
          if (todos.length > 0) {
            // Get the matched client ID
            const matchedEmail = await db.query.inboundEmails.findFirst({
              where: eq(inboundEmails.id, email.id),
            });

            await Promise.all(
              todos.map((todo) =>
                createActionItem({
                  userId: user.id,
                  clientId: matchedEmail?.clientId || undefined,
                  emailId: email.id,
                  title: todo.title,
                  description: todo.description,
                  owner: todo.owner,
                  ownerType: todo.ownerType,
                  priority: todo.priority,
                  dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
                  source: "email",
                  sourceContext: todo.sourceContext,
                })
              )
            );
            console.log(`Extracted ${todos.length} action items from email ${email.id}`);
          }
        })
        .catch((err) => {
          console.error("Failed to extract action items from email:", err);
        });
    }

    return NextResponse.json({ success: true, emailId: email.id });
  } catch (error) {
    console.error("Email ingestion error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}
