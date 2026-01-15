import { db } from "@/db";
import { executionPlans, ExecutionPlan, NewExecutionPlan, ExecutionPlanSection } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getExecutionPlans(userId: string, clientId?: string) {
  const conditions = [eq(executionPlans.userId, userId)];
  if (clientId) {
    conditions.push(eq(executionPlans.clientId, clientId));
  }
  
  return db.query.executionPlans.findMany({
    where: and(...conditions),
    with: {
      client: true,
    },
    orderBy: [desc(executionPlans.updatedAt)],
  });
}

export async function getExecutionPlan(id: string, userId: string) {
  return db.query.executionPlans.findFirst({
    where: and(
      eq(executionPlans.id, id),
      eq(executionPlans.userId, userId)
    ),
    with: {
      client: true,
      clarityCanvas: true,
    },
  });
}

// Public getter - for share pages (no user verification)
// Returns limited data for security
export async function getExecutionPlanPublic(id: string) {
  const plan = await db.query.executionPlans.findFirst({
    where: eq(executionPlans.id, id),
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

  if (!plan) return null;

  // Return only necessary fields for display (no sensitive data)
  return {
    id: plan.id,
    clientId: plan.clientId,
    title: plan.title,
    objective: plan.objective,
    timeframe: plan.timeframe,
    startDate: plan.startDate,
    targetDate: plan.targetDate,
    goal: plan.goal,
    successMetrics: plan.successMetrics,
    sections: plan.sections,
    notes: plan.notes,
    rules: plan.rules,
    status: plan.status,
    client: plan.client,
  };
}

export async function createExecutionPlan(data: NewExecutionPlan) {
  const [plan] = await db.insert(executionPlans).values(data).returning();
  return plan;
}

export async function updateExecutionPlan(
  id: string, 
  userId: string, 
  data: Partial<Omit<ExecutionPlan, 'id' | 'userId' | 'createdAt'>>
) {
  const [plan] = await db
    .update(executionPlans)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(executionPlans.id, id), eq(executionPlans.userId, userId)))
    .returning();
  return plan;
}

export async function deleteExecutionPlan(id: string, userId: string) {
  await db
    .delete(executionPlans)
    .where(and(eq(executionPlans.id, id), eq(executionPlans.userId, userId)));
}

// Helper to create default sections structure
export function createDefaultSections(): ExecutionPlanSection[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "(a) Setup & Prerequisites",
      items: [],
      order: 0,
    },
    {
      id: crypto.randomUUID(),
      title: "(b) Core Actions",
      items: [],
      order: 1,
    },
    {
      id: crypto.randomUUID(),
      title: "(c) Follow-up & Iteration",
      items: [],
      order: 2,
    },
  ];
}

// Helper to create a plan from a Clarity swimlane item
export function createPlanFromSwimline(
  swimlaneKey: string,
  timeframe: 'short' | 'mid' | 'long',
  itemText: string,
  clientId: string,
  userId: string,
  clarityCanvasId: string
): NewExecutionPlan {
  return {
    clientId,
    userId,
    title: itemText,
    objective: itemText,
    timeframe: timeframe === 'short' ? '30 days' : timeframe === 'mid' ? '90 days' : '12 months',
    sourceSwimlanelKey: swimlaneKey,
    sourceTimeframe: timeframe,
    sourceClarityCanvasId: clarityCanvasId,
    sections: createDefaultSections(),
    rules: [],
    status: 'draft',
  };
}
