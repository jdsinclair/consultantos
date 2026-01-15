import { db } from "@/db";
import {
  clientPortals,
  sharedItems,
  portalAccessLogs,
  ClientPortal,
  NewClientPortal,
  SharedItem,
  NewSharedItem,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// Generate a secure random token (URL-safe base64)
function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // ~32 chars
}

// Generate a shorter deep link token
function generateDeepLinkToken(): string {
  return crypto.randomBytes(12).toString("base64url"); // ~16 chars
}

// ==================== Portal Operations ====================

export async function getPortalByClient(clientId: string, userId: string) {
  return db.query.clientPortals.findFirst({
    where: and(
      eq(clientPortals.clientId, clientId),
      eq(clientPortals.userId, userId)
    ),
    with: {
      client: true,
      sharedItems: {
        where: eq(sharedItems.isVisible, true),
        orderBy: [sharedItems.displayOrder],
      },
    },
  });
}

export async function getPortalByToken(accessToken: string) {
  const portal = await db.query.clientPortals.findFirst({
    where: and(
      eq(clientPortals.accessToken, accessToken),
      eq(clientPortals.isActive, true)
    ),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          company: true,
        },
      },
      sharedItems: {
        where: eq(sharedItems.isVisible, true),
        orderBy: [sharedItems.displayOrder],
      },
    },
  });

  if (!portal) return null;

  // Check expiration
  if (portal.expiresAt && new Date(portal.expiresAt) < new Date()) {
    return null;
  }

  // Update access stats
  await db
    .update(clientPortals)
    .set({
      lastAccessedAt: new Date(),
      accessCount: (portal.accessCount || 0) + 1,
    })
    .where(eq(clientPortals.id, portal.id));

  return portal;
}

export async function createPortal(
  clientId: string,
  userId: string,
  options?: Partial<Pick<ClientPortal, "name" | "welcomeMessage" | "brandColor" | "expiresAt">>
): Promise<ClientPortal> {
  // Check if portal already exists
  const existing = await getPortalByClient(clientId, userId);
  if (existing) {
    return existing;
  }

  const [portal] = await db
    .insert(clientPortals)
    .values({
      clientId,
      userId,
      accessToken: generateToken(),
      ...options,
    })
    .returning();

  return portal;
}

export async function updatePortal(
  portalId: string,
  userId: string,
  data: Partial<Pick<ClientPortal, "name" | "welcomeMessage" | "brandColor" | "isActive" | "expiresAt">>
) {
  const [portal] = await db
    .update(clientPortals)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clientPortals.id, portalId), eq(clientPortals.userId, userId)))
    .returning();
  return portal;
}

export async function regeneratePortalToken(portalId: string, userId: string) {
  const [portal] = await db
    .update(clientPortals)
    .set({ accessToken: generateToken(), updatedAt: new Date() })
    .where(and(eq(clientPortals.id, portalId), eq(clientPortals.userId, userId)))
    .returning();
  return portal;
}

export async function deletePortal(portalId: string, userId: string) {
  await db
    .delete(clientPortals)
    .where(and(eq(clientPortals.id, portalId), eq(clientPortals.userId, userId)));
}

// ==================== Shared Items Operations ====================

export async function getSharedItemsByPortal(portalId: string) {
  return db.query.sharedItems.findMany({
    where: eq(sharedItems.portalId, portalId),
    orderBy: [sharedItems.displayOrder],
  });
}

export async function getSharedItemByDeepLink(deepLinkToken: string) {
  const item = await db.query.sharedItems.findFirst({
    where: and(
      eq(sharedItems.deepLinkToken, deepLinkToken),
      eq(sharedItems.isVisible, true)
    ),
    with: {
      portal: {
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  // Check if portal is active
  if (!item.portal?.isActive) return null;

  // Check expiration
  if (item.portal.expiresAt && new Date(item.portal.expiresAt) < new Date()) {
    return null;
  }

  // Update view stats
  await db
    .update(sharedItems)
    .set({
      viewCount: (item.viewCount || 0) + 1,
      lastViewedAt: new Date(),
    })
    .where(eq(sharedItems.id, item.id));

  return item;
}

export async function addSharedItem(
  portalId: string,
  userId: string,
  itemType: string,
  itemId: string,
  displayName?: string
): Promise<SharedItem> {
  // Check if already shared
  const existing = await db.query.sharedItems.findFirst({
    where: and(
      eq(sharedItems.portalId, portalId),
      eq(sharedItems.itemId, itemId)
    ),
  });

  if (existing) {
    // Make visible again if it was hidden
    if (!existing.isVisible) {
      const [updated] = await db
        .update(sharedItems)
        .set({ isVisible: true, updatedAt: new Date() })
        .where(eq(sharedItems.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // Get next display order
  const items = await getSharedItemsByPortal(portalId);
  const maxOrder = items.reduce((max, item) => Math.max(max, item.displayOrder || 0), -1);

  const [item] = await db
    .insert(sharedItems)
    .values({
      portalId,
      userId,
      itemType,
      itemId,
      displayName,
      displayOrder: maxOrder + 1,
      deepLinkToken: generateDeepLinkToken(),
    })
    .returning();

  return item;
}

export async function updateSharedItem(
  itemId: string,
  userId: string,
  data: Partial<Pick<SharedItem, "displayName" | "displayOrder" | "isVisible">>
) {
  const [item] = await db
    .update(sharedItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sharedItems.id, itemId), eq(sharedItems.userId, userId)))
    .returning();
  return item;
}

export async function removeSharedItem(itemId: string, userId: string) {
  // Soft delete - just hide it
  const [item] = await db
    .update(sharedItems)
    .set({ isVisible: false, updatedAt: new Date() })
    .where(and(eq(sharedItems.id, itemId), eq(sharedItems.userId, userId)))
    .returning();
  return item;
}

export async function deleteSharedItem(itemId: string, userId: string) {
  await db
    .delete(sharedItems)
    .where(and(eq(sharedItems.id, itemId), eq(sharedItems.userId, userId)));
}

// ==================== Access Logging ====================

export async function logPortalAccess(
  portalId: string,
  accessType: string,
  sharedItemId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  await db.insert(portalAccessLogs).values({
    portalId,
    sharedItemId,
    accessType,
    ipAddress,
    userAgent,
  });
}

export async function getPortalAccessLogs(portalId: string, limit = 50) {
  return db.query.portalAccessLogs.findMany({
    where: eq(portalAccessLogs.portalId, portalId),
    orderBy: [desc(portalAccessLogs.createdAt)],
    limit,
    with: {
      sharedItem: true,
    },
  });
}

// ==================== Helper Functions ====================

// Get all portals for a user
export async function getUserPortals(userId: string) {
  return db.query.clientPortals.findMany({
    where: eq(clientPortals.userId, userId),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          company: true,
        },
      },
      sharedItems: {
        where: eq(sharedItems.isVisible, true),
      },
    },
    orderBy: [desc(clientPortals.updatedAt)],
  });
}

// Get shared items for a specific item (to check if it's already shared)
export async function getItemSharedStatus(itemId: string, userId: string) {
  return db.query.sharedItems.findMany({
    where: and(
      eq(sharedItems.itemId, itemId),
      eq(sharedItems.userId, userId),
      eq(sharedItems.isVisible, true)
    ),
    with: {
      portal: {
        with: {
          client: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
