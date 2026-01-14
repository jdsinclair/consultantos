// Database operations for Clarity Method canvases

import { db } from "@/db";
import { clarityMethodCanvases } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get Clarity Method canvas for a client
 */
export async function getClarityMethodCanvas(clientId: string, userId: string) {
  return db.query.clarityMethodCanvases.findFirst({
    where: and(
      eq(clarityMethodCanvases.clientId, clientId),
      eq(clarityMethodCanvases.userId, userId)
    ),
  });
}

/**
 * Check if a client has a Clarity Method canvas
 */
export async function hasClarityMethodCanvas(clientId: string, userId: string): Promise<boolean> {
  const canvas = await db.query.clarityMethodCanvases.findFirst({
    where: and(
      eq(clarityMethodCanvases.clientId, clientId),
      eq(clarityMethodCanvases.userId, userId)
    ),
    columns: { id: true },
  });
  return !!canvas;
}
