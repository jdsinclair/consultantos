import { db } from "@/db";
import { clarityDocuments, clarityInsights } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { NewClarityDocument, ClaritySection, NewClarityInsight, ClarityFieldMeta } from "@/db/schema";

export async function getClarityDocument(clientId: string, userId: string) {
  return db.query.clarityDocuments.findFirst({
    where: and(
      eq(clarityDocuments.clientId, clientId),
      eq(clarityDocuments.userId, userId)
    ),
  });
}

export async function createClarityDocument(data: NewClarityDocument) {
  const [doc] = await db.insert(clarityDocuments).values(data).returning();
  return doc;
}

export async function updateClarityDocument(
  clientId: string,
  userId: string,
  data: Partial<NewClarityDocument>
) {
  const [doc] = await db
    .update(clarityDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(clarityDocuments.clientId, clientId),
        eq(clarityDocuments.userId, userId)
      )
    )
    .returning();
  return doc;
}

export async function getOrCreateClarityDocument(clientId: string, userId: string) {
  let doc = await getClarityDocument(clientId, userId);

  if (!doc) {
    doc = await createClarityDocument({
      clientId,
      userId,
    });
  }

  return doc;
}

// Add a locked-in section to the clarity document
export async function addClaritySection(
  clientId: string,
  userId: string,
  section: ClaritySection
) {
  const doc = await getOrCreateClarityDocument(clientId, userId);
  const existingSections = (doc.sections || []) as ClaritySection[];

  const [updated] = await db
    .update(clarityDocuments)
    .set({
      sections: [...existingSections, section],
      updatedAt: new Date(),
    })
    .where(eq(clarityDocuments.id, doc.id))
    .returning();

  return updated;
}

// Update positioning statement from components
export async function updatePositioningStatement(
  clientId: string,
  userId: string,
  niche: string,
  desiredOutcome: string,
  offer: string
) {
  const positioningStatement = `We help ${niche} achieve ${desiredOutcome} with ${offer}`;

  const doc = await getOrCreateClarityDocument(clientId, userId);

  const [updated] = await db
    .update(clarityDocuments)
    .set({
      niche,
      desiredOutcome,
      offer,
      positioningStatement,
      updatedAt: new Date(),
    })
    .where(eq(clarityDocuments.id, doc.id))
    .returning();

  return updated;
}

// ============================================
// Clarity Insights Functions
// ============================================

// Get all pending insights for a client
export async function getPendingInsights(clientId: string, userId: string) {
  return db.query.clarityInsights.findMany({
    where: and(
      eq(clarityInsights.clientId, clientId),
      eq(clarityInsights.userId, userId),
      eq(clarityInsights.status, "pending")
    ),
    orderBy: [desc(clarityInsights.createdAt)],
  });
}

// Get all insights for a client (including reviewed)
export async function getAllInsights(clientId: string, userId: string) {
  return db.query.clarityInsights.findMany({
    where: and(
      eq(clarityInsights.clientId, clientId),
      eq(clarityInsights.userId, userId)
    ),
    orderBy: [desc(clarityInsights.createdAt)],
  });
}

// Create a new insight
export async function createClarityInsight(data: NewClarityInsight) {
  const [insight] = await db.insert(clarityInsights).values(data).returning();
  return insight;
}

// Accept an insight - apply the suggested value to the clarity document
export async function acceptInsight(insightId: string, userId: string) {
  // First get the insight
  const insight = await db.query.clarityInsights.findFirst({
    where: and(
      eq(clarityInsights.id, insightId),
      eq(clarityInsights.userId, userId)
    ),
  });

  if (!insight) return null;

  // Update the insight status
  await db
    .update(clarityInsights)
    .set({
      status: "accepted",
      reviewedAt: new Date(),
    })
    .where(eq(clarityInsights.id, insightId));

  // Get the clarity document
  const doc = await getOrCreateClarityDocument(insight.clientId, userId);

  // Build the update based on field name
  const fieldName = insight.fieldName;
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
    lastUpdatedBy: "ai",
  };

  // Handle standard fields
  const standardFields = [
    "niche", "desiredOutcome", "offer", "positioningStatement",
    "whoWeAre", "whatWeDo", "howWeDoIt", "ourWedge",
    "whyPeopleLoveUs", "howWeWillDie"
  ];

  if (standardFields.includes(fieldName)) {
    updateData[fieldName] = insight.suggestedValue;

    // Update field metadata
    const currentMeta = (doc.fieldMeta || {}) as Record<string, ClarityFieldMeta>;
    const fieldHistory = currentMeta[fieldName]?.history || [];

    // Add current value to history if it exists
    const currentValue = doc[fieldName as keyof typeof doc] as string | null;
    if (currentValue) {
      fieldHistory.push({
        content: currentValue,
        changedAt: new Date().toISOString(),
        source: "previous",
      });
    }

    currentMeta[fieldName] = {
      status: "draft",
      source: `insight:${insightId}`,
      sourceContext: insight.sourceContext || undefined,
      history: fieldHistory.slice(-5), // Keep last 5 versions
    };
    updateData.fieldMeta = currentMeta;
  }

  // Update the clarity document
  const [updated] = await db
    .update(clarityDocuments)
    .set(updateData)
    .where(eq(clarityDocuments.id, doc.id))
    .returning();

  return { insight, clarityDocument: updated };
}

// Reject an insight
export async function rejectInsight(insightId: string, userId: string) {
  const [insight] = await db
    .update(clarityInsights)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
    })
    .where(and(
      eq(clarityInsights.id, insightId),
      eq(clarityInsights.userId, userId)
    ))
    .returning();

  return insight;
}

// Defer an insight for later
export async function deferInsight(insightId: string, userId: string) {
  const [insight] = await db
    .update(clarityInsights)
    .set({
      status: "deferred",
      reviewedAt: new Date(),
    })
    .where(and(
      eq(clarityInsights.id, insightId),
      eq(clarityInsights.userId, userId)
    ))
    .returning();

  return insight;
}

// Update field status (draft -> confirmed -> locked)
export async function updateFieldStatus(
  clientId: string,
  userId: string,
  fieldName: string,
  status: "draft" | "confirmed" | "locked"
) {
  const doc = await getOrCreateClarityDocument(clientId, userId);
  const currentMeta = (doc.fieldMeta || {}) as Record<string, ClarityFieldMeta>;

  currentMeta[fieldName] = {
    ...currentMeta[fieldName],
    status,
    confirmedAt: status === "confirmed" ? new Date().toISOString() : currentMeta[fieldName]?.confirmedAt,
    lockedAt: status === "locked" ? new Date().toISOString() : currentMeta[fieldName]?.lockedAt,
  };

  const [updated] = await db
    .update(clarityDocuments)
    .set({
      fieldMeta: currentMeta,
      updatedAt: new Date(),
    })
    .where(eq(clarityDocuments.id, doc.id))
    .returning();

  return updated;
}

// Count pending insights for a client
export async function countPendingInsights(clientId: string, userId: string) {
  const insights = await db.query.clarityInsights.findMany({
    where: and(
      eq(clarityInsights.clientId, clientId),
      eq(clarityInsights.userId, userId),
      eq(clarityInsights.status, "pending")
    ),
  });
  return insights.length;
}
