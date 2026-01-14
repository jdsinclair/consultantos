import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { users, inboundEmails, sources, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

// Webhook endpoint for receiving emails (e.g., from SendGrid Inbound Parse, Mailgun, etc.)
export async function POST(req: NextRequest) {
  try {
    // Parse the inbound email
    // This format depends on your email provider (SendGrid, Mailgun, Postmark, etc.)
    const formData = await req.formData();

    const to = formData.get("to") as string;
    const from = formData.get("from") as string;
    const subject = formData.get("subject") as string;
    const text = formData.get("text") as string;
    const html = formData.get("html") as string;

    // Extract user ID from the ingest email address
    // Format: inbox-{userId8chars}@ingest.consultantos.com
    const match = to.match(/inbox-([a-z0-9]+)@/i);
    if (!match) {
      return NextResponse.json({ error: "Invalid ingest email" }, { status: 400 });
    }

    // Find user by ingest email
    const user = await db.query.users.findFirst({
      where: eq(users.ingestEmail, to.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse sender info
    const fromMatch = from.match(/(?:"?([^"]*)"?\s)?(?:<)?(.+@[^>]+)(?:>)?/);
    const fromName = fromMatch?.[1] || null;
    const fromEmail = fromMatch?.[2] || from;

    // Handle attachments
    const attachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      blobUrl?: string;
    }> = [];

    // Process attachments (format depends on email provider)
    const attachmentCount = parseInt(formData.get("attachments") as string) || 0;
    for (let i = 1; i <= attachmentCount; i++) {
      const attachment = formData.get(`attachment${i}`) as File;
      if (attachment) {
        // Upload to Vercel Blob
        const blob = await put(
          `emails/${user.id}/${Date.now()}-${attachment.name}`,
          attachment,
          { access: "public" }
        );

        attachments.push({
          id: `att-${Date.now()}-${i}`,
          filename: attachment.name,
          contentType: attachment.type,
          size: attachment.size,
          blobUrl: blob.url,
        });
      }
    }

    // Create inbound email record
    const [email] = await db
      .insert(inboundEmails)
      .values({
        userId: user.id,
        fromEmail,
        fromName,
        toEmail: to,
        subject,
        bodyText: text,
        bodyHtml: html,
        attachments,
        status: "inbox",
      })
      .returning();

    // Try to auto-match to a client based on sender email domain
    const senderDomain = fromEmail.split("@")[1];
    const matchingClient = await db.query.clients.findFirst({
      where: eq(clients.userId, user.id),
      // Would need more sophisticated matching in production
    });

    if (matchingClient) {
      await db
        .update(inboundEmails)
        .set({ clientId: matchingClient.id })
        .where(eq(inboundEmails.id, email.id));
    }

    return NextResponse.json({ success: true, emailId: email.id });
  } catch (error) {
    console.error("Email ingestion error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}
