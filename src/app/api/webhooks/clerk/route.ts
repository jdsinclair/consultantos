import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createDefaultMethods } from "@/lib/db/methods";
import { createDefaultPersonas } from "@/lib/db/personas";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // Create user in database
    const [user] = await db
      .insert(users)
      .values({
        id,
        email: email_addresses[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim() || null,
        imageUrl: image_url,
      })
      .returning();

    // Create default methods and personas for new user
    await Promise.all([
      createDefaultMethods(user.id),
      createDefaultPersonas(user.id),
    ]);

    return new Response("User created", { status: 200 });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await db
      .update(users)
      .set({
        email: email_addresses[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim() || null,
        imageUrl: image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return new Response("User updated", { status: 200 });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      // Cascade delete will handle related records
      await db.delete(users).where(eq(users.id, id));
    }

    return new Response("User deleted", { status: 200 });
  }

  return new Response("Webhook received", { status: 200 });
}
