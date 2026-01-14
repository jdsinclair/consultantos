import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, methods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createDefaultMethods } from "@/lib/db/methods";
import { createDefaultPersonas } from "@/lib/db/personas";

// PATCH - save onboarding progress
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { step, data } = await req.json();

    const [user] = await db
      .update(users)
      .set({
        onboardingStep: step,
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}

// POST - complete onboarding
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Generate unique ingest email
    const ingestEmail = `inbox-${userId.slice(0, 8)}@ingest.consultantos.com`;

    // Update user with all onboarding data
    const [user] = await db
      .update(users)
      .set({
        name: data.name,
        nickname: data.nickname,
        businessName: data.businessName,
        website: data.website,
        phone: data.phone,
        bio: data.bio,
        specialties: data.specialties,
        ingestEmail,
        onboardingCompleted: true,
        onboardingStep: 3,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Create default methods and personas if not already created
    const existingMethods = await db.query.methods.findFirst({
      where: eq(methods.userId, userId),
    });

    if (!existingMethods) {
      await Promise.all([
        createDefaultMethods(userId),
        createDefaultPersonas(userId),
      ]);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
