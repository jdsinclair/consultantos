import { NextRequest, NextResponse } from "next/server";
import { createProspectFromWebhook } from "@/lib/db/clients";

// Webhook endpoint for creating prospects from external sources (Zapier, etc.)
//
// Usage:
//   POST /api/webhooks/prospects
//   Headers:
//     X-Webhook-Secret: your-secret-from-env
//   Body (JSON) - single object OR array:
//     { "firstName": "John", "lastName": "Doe", ... }
//     OR
//     [{ "firstName": "John", "lastName": "Doe", ... }]
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

    // Parse payload - handle both array and single object
    let rawPayload: any;
    try {
      rawPayload = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload", details: String(parseError) },
        { status: 400 }
      );
    }

    const payloads = Array.isArray(rawPayload) ? rawPayload : [rawPayload];

    const results: { id: string; name: string }[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];

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
        errors.push({ index: i, error: "firstName is required" });
        continue;
      }

      if (!lastName) {
        errors.push({ index: i, error: "lastName is required" });
        continue;
      }

      try {
        // Create the prospect
        const prospect = await createProspectFromWebhook({
          userId,
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
        });

        console.log(`Webhook: Created prospect ${prospect.id} - ${prospect.name}`);
        results.push({ id: prospect.id, name: prospect.name });
      } catch (dbError) {
        console.error("DB error creating prospect:", dbError);
        errors.push({
          index: i,
          error: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        });
      }
    }

    // Return response with debug info
    return NextResponse.json({
      success: results.length > 0,
      created: results,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        receivedPayload: rawPayload,
        userId: userId,
        payloadCount: payloads.length,
      },
    });
  } catch (error) {
    console.error("Prospect webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to create prospect",
        details: error instanceof Error ? error.message : String(error),
      },
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
