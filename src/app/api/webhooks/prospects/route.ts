import { NextRequest, NextResponse } from "next/server";
import { createProspectFromWebhook } from "@/lib/db/clients";

// Webhook endpoint for creating prospects from external sources (Zapier, etc.)
//
// Usage:
//   POST /api/webhooks/prospects
//   Headers:
//     X-Webhook-Secret: your-secret-from-env
//   Body (JSON):
//     {
//       "firstName": "John",    // or "first_name" or "First Name"
//       "lastName": "Doe",      // or "last_name" or "Last Name"
//       "email": "john@example.com",  // optional
//       "phone": "+15551234567"       // optional
//     }
//
// Environment variables:
//   PROSPECT_WEBHOOK_SECRET - Secret key for authentication
//   PROSPECT_WEBHOOK_USER_ID - Clerk user ID to create prospects for

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.PROSPECT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("PROSPECT_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
      console.error("Invalid webhook secret");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user ID from env
    const userId = process.env.PROSPECT_WEBHOOK_USER_ID;
    if (!userId) {
      console.error("PROSPECT_WEBHOOK_USER_ID not configured");
      return NextResponse.json(
        { error: "Webhook user not configured" },
        { status: 500 }
      );
    }

    // Parse and normalize the payload
    // Support various field naming conventions from Zapier
    const payload = await req.json();

    const firstName = normalizeField(payload, [
      "firstName",
      "first_name",
      "First Name",
      "firstname",
      "FirstName",
    ]);

    const lastName = normalizeField(payload, [
      "lastName",
      "last_name",
      "Last Name",
      "lastname",
      "LastName",
    ]);

    const email = normalizeField(payload, [
      "email",
      "Email",
      "EMAIL",
      "e-mail",
      "emailAddress",
      "email_address",
    ]);

    const phone = normalizeField(payload, [
      "phone",
      "Phone",
      "PHONE",
      "phoneNumber",
      "phone_number",
      "Phone Number",
      "mobile",
      "Mobile",
    ]);

    // Validate required fields
    if (!firstName) {
      return NextResponse.json(
        { error: "firstName is required" },
        { status: 400 }
      );
    }

    if (!lastName) {
      return NextResponse.json(
        { error: "lastName is required" },
        { status: 400 }
      );
    }

    // Create the prospect
    const prospect = await createProspectFromWebhook({
      userId,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
    });

    console.log(`Webhook: Created prospect ${prospect.id} - ${prospect.name}`);

    // Return success (ACK for Zapier)
    return NextResponse.json({
      success: true,
      id: prospect.id,
    });
  } catch (error) {
    console.error("Prospect webhook error:", error);
    return NextResponse.json(
      { error: "Failed to create prospect" },
      { status: 500 }
    );
  }
}

// Helper to extract field value from multiple possible key names
function normalizeField(payload: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      return String(payload[key]).trim();
    }
  }
  return null;
}
