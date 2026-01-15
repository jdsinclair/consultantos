import { db } from "@/db";
import { roadmaps, Roadmap, NewRoadmap, RoadmapSwimlane, RoadmapItem, RoadmapBacklogItem } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DEFAULT_SWIMLANES } from "@/lib/roadmap/types";

export async function getRoadmaps(userId: string, clientId?: string) {
  const conditions = [eq(roadmaps.userId, userId)];
  if (clientId) {
    conditions.push(eq(roadmaps.clientId, clientId));
  }

  return db.query.roadmaps.findMany({
    where: and(...conditions),
    with: {
      client: true,
    },
    orderBy: [desc(roadmaps.updatedAt)],
  });
}

export async function getRoadmap(id: string, userId: string) {
  return db.query.roadmaps.findFirst({
    where: and(
      eq(roadmaps.id, id),
      eq(roadmaps.userId, userId)
    ),
    with: {
      client: true,
    },
  });
}

// Public getter - for share pages (no user verification)
export async function getRoadmapPublic(id: string) {
  const roadmap = await db.query.roadmaps.findFirst({
    where: eq(roadmaps.id, id),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          company: true,
        },
      },
    },
  });

  if (!roadmap) return null;

  // Return only necessary fields for display
  return {
    id: roadmap.id,
    clientId: roadmap.clientId,
    title: roadmap.title,
    objective: roadmap.objective,
    vision: roadmap.vision,
    planningHorizon: roadmap.planningHorizon,
    swimlanes: roadmap.swimlanes,
    items: roadmap.items,
    backlog: roadmap.backlog,
    successMetrics: roadmap.successMetrics,
    notes: roadmap.notes,
    status: roadmap.status,
    client: roadmap.client,
  };
}

export async function createRoadmap(data: NewRoadmap) {
  const [roadmap] = await db.insert(roadmaps).values(data).returning();
  return roadmap;
}

export async function updateRoadmap(
  id: string,
  userId: string,
  data: Partial<Omit<Roadmap, 'id' | 'userId' | 'createdAt'>>
) {
  const [roadmap] = await db
    .update(roadmaps)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(roadmaps.id, id), eq(roadmaps.userId, userId)))
    .returning();
  return roadmap;
}

export async function deleteRoadmap(id: string, userId: string) {
  await db
    .delete(roadmaps)
    .where(and(eq(roadmaps.id, id), eq(roadmaps.userId, userId)));
}

// Helper to create default swimlanes
export function createDefaultSwimlanes(): RoadmapSwimlane[] {
  return DEFAULT_SWIMLANES.map((s, i) => ({
    ...s,
    order: i,
  }));
}

// Helper to create a new roadmap item
export function createRoadmapItem(
  title: string,
  swimlaneKey: string,
  timeframe: 'now' | 'next' | 'later' | 'someday' = 'later',
  options?: Partial<RoadmapItem>
): RoadmapItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    swimlaneKey,
    timeframe,
    order: 0,
    status: 'idea',
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

// Helper to create a backlog item
export function createBacklogItem(
  title: string,
  options?: Partial<RoadmapBacklogItem>
): RoadmapBacklogItem {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
    order: 0,
    ...options,
  };
}

// Helper to move backlog item to board
export function moveBacklogToBoard(
  backlogItem: RoadmapBacklogItem,
  swimlaneKey: string,
  timeframe: 'now' | 'next' | 'later' | 'someday'
): RoadmapItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: backlogItem.title,
    description: backlogItem.description,
    notes: backlogItem.notes,
    swimlaneKey,
    timeframe,
    order: 0,
    status: 'idea',
    links: backlogItem.links,
    source: backlogItem.source,
    sourceContext: backlogItem.sourceContext,
    createdAt: now,
    updatedAt: now,
  };
}

// Create new roadmap with defaults
export function createNewRoadmap(
  clientId: string,
  userId: string,
  title: string = 'Product Roadmap'
): NewRoadmap {
  return {
    clientId,
    userId,
    title,
    objective: '',
    vision: '',
    planningHorizon: '',
    swimlanes: createDefaultSwimlanes(),
    items: [],
    backlog: [],
    successMetrics: {
      quantitative: [],
      qualitative: [],
    },
    notes: '',
    status: 'draft',
  };
}
