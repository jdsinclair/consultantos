import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { users, inboundEmails, clients } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

// Webhook endpoint for receiving emails
// Supports both Resend and Cloudflare Email Worker formats
export async function POST(req: NextRequest) {
  try {
    // Check for webhook secret (required for CF Worker, optional for Resend with signature)
    const cfSecret = req.headers.get("x-webhook-secret");
    const resendSignature = req.headers.get("svix-signature");
    
    // Validate authentication
    if (process.env.EMAIL_WEBHOOK_SECRET && cfSecret) {
      // Cloudflare Worker format
      if (cfSecret !== process.env.EMAIL_WEBHOOK_SECRET) {
        console.error("Invalid webhook secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (!resendSignature && !cfSecret) {
      // No auth provided - reject unless in development
      if (process.env.NODE_ENV === "production") {
        console.error("No authentication provided");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await req.json();
    
    // Normalize payload from different providers
    let emailData: {
      to: string;
      from: string;
      fromName?: string;
      fromEmail: string;
      subject?: string;
      text?: string;
      html?: string;
      messageId?: string;
      attachments: Array<{
        filename: string;
        contentType: string;
        size?: number;
        content?: string; // base64
        url?: string; // for Resend
      }>;
    };

    // Detect format and normalize
    if (payload.type === "email.received" || payload.data?.to) {
      // Resend format
      const data = payload.data || payload;
      emailData = {
        to: Array.isArray(data.to) ? data.to[0] : data.to,
        from: data.from,
        fromName: data.from?.split("<")[0]?.trim() || undefined,
        fromEmail: data.from?.match(/<(.+)>/)?.[1] || data.from,
        subject: data.subject,
        text: data.text,
        html: data.html,
        messageId: data.message_id,
        attachments: (data.attachments || []).map((att: any) => ({
          filename: att.filename,
          contentType: att.content_type || att.contentType,
          size: att.size,
          content: att.content,
          url: att.url,
        })),
      };
    } else {
      // Cloudflare Worker format (or generic)
      emailData = {
        to: payload.to,
        from: payload.from,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail || payload.from,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        messageId: payload.messageId,
        attachments: payload.attachments || [],
      };
    }

    // Find user by ingest email address
    const user = await db.query.users.findFirst({
      where: eq(users.ingestEmail, emailData.to.toLowerCase()),
    });

    if (!user) {
      console.error(`No user found for ingest email: ${emailData.to}`);
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

    for (const att of emailData.attachments) {
      try {
        let buffer: Buffer | null = null;
        
        if (att.content) {
          // Base64 encoded content (CF Worker format)
          buffer = Buffer.from(att.content, "base64");
        } else if (att.url) {
          // URL to fetch (Resend format)
          const response = await fetch(att.url);
          buffer = Buffer.from(await response.arrayBuffer());
        }

        if (buffer) {
          const blob = await put(
            `emails/${user.id}/${Date.now()}-${att.filename}`,
            buffer,
            { access: "public", contentType: att.contentType }
          );

          processedAttachments.push({
            id: `att-${Date.now()}-${processedAttachments.length}`,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size || buffer.length,
            blobUrl: blob.url,
          });
        }
      } catch (attachError) {
        console.error(`Failed to process attachment ${att.filename}:`, attachError);
        processedAttachments.push({
          id: `att-${Date.now()}-${processedAttachments.length}`,
          filename: att.filename,
          contentType: att.contentType,
          size: att.size || 0,
        });
      }
    }

    // Create inbound email record
    const [email] = await db
      .insert(inboundEmails)
      .values({
        userId: user.id,
        fromEmail: emailData.fromEmail,
        fromName: emailData.fromName,
        toEmail: emailData.to,
        subject: emailData.subject,
        bodyText: emailData.text,
        bodyHtml: emailData.html,
        attachments: processedAttachments,
        messageId: emailData.messageId,
        status: "inbox",
      })
      .returning();

    // Try to auto-match to a client based on sender email domain
    const senderDomain = emailData.fromEmail.split("@")[1]?.toLowerCase();
    if (senderDomain) {
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

    return NextResponse.json({ success: true, emailId: email.id });
  } catch (error) {
    console.error("Email ingestion error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}
