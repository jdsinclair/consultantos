/**
 * Cloudflare Email Worker for ConsultantOS
 *
 * This worker receives inbound emails and forwards them to your API.
 *
 * Setup:
 * 1. Create a new Worker in Cloudflare Dashboard
 * 2. Paste this code
 * 3. Add environment variables:
 *    - WEBHOOK_URL: https://yourdomain.com/api/webhooks/email
 *    - WEBHOOK_SECRET: (generate a random string, add same to your .env)
 * 4. Go to Email Routing → Routes → Create catch-all → Send to Worker
 */

import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    // Validate environment
    if (!env.WEBHOOK_URL || !env.WEBHOOK_SECRET) {
      console.error('Missing WEBHOOK_URL or WEBHOOK_SECRET environment variables');
      message.setReject('Configuration error');
      return;
    }

    // Parse the email
    const parser = new PostalMime();
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const email = await parser.parse(rawEmail);

    // Extract recipient - validate it matches our pattern
    const to = message.to.toLowerCase();
    const inboxMatch = to.match(/^inbox-([a-z0-9_]+)@/i);

    if (!inboxMatch) {
      // Not an ingest email, reject or forward elsewhere
      console.log(`Rejected: ${to} doesn't match inbox pattern`);
      message.setReject('Invalid recipient');
      return;
    }

    // Prepare attachments (base64 encoded for JSON transport)
    const attachments = [];
    if (email.attachments && email.attachments.length > 0) {
      for (const att of email.attachments) {
        // Convert ArrayBuffer to base64
        const base64 = arrayBufferToBase64(att.content);
        attachments.push({
          filename: att.filename || 'attachment',
          contentType: att.mimeType || 'application/octet-stream',
          size: att.content.byteLength,
          content: base64, // Base64 encoded content
        });
      }
    }

    // Build payload
    const payload = {
      to: to,
      from: message.from,
      fromName: email.from?.name || null,
      fromEmail: email.from?.address || message.from,
      subject: email.subject || null,
      text: email.text || null,
      html: email.html || null,
      date: email.date || new Date().toISOString(),
      messageId: email.messageId || null,
      inReplyTo: email.inReplyTo || null,
      attachments: attachments,
      headers: Object.fromEntries(
        (email.headers || []).map(h => [h.key, h.value])
      ),
    };

    // Send to webhook
    try {
      const response = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': env.WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Webhook error: ${response.status} - ${error}`);
        // Don't reject - we received the email, just failed to process
        // You could implement retry logic here
      } else {
        console.log(`Email processed: ${email.subject} from ${message.from}`);
      }
    } catch (error) {
      console.error('Failed to send to webhook:', error);
    }
  },
};

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
