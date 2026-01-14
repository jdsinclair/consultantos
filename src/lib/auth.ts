import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // Get or create user in our database
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (existingUser) return existingUser;

  // User doesn't exist, create from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const [newUser] = await db
    .insert(users)
    .values({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      imageUrl: clerkUser.imageUrl,
    })
    .returning();

  return newUser;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
