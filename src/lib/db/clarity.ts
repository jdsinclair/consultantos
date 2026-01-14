import { db } from "@/db";
import { clarityDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { NewClarityDocument, ClaritySection } from "@/db/schema";

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
