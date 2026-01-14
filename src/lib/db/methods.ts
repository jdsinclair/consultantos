import { db } from "@/db";
import { methods } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import type { NewMethod, MethodStep } from "@/db/schema";

export async function getMethods(userId: string) {
  return db.query.methods.findMany({
    where: or(eq(methods.userId, userId), eq(methods.isTemplate, true)),
    orderBy: [desc(methods.createdAt)],
  });
}

export async function getMethod(methodId: string, userId: string) {
  return db.query.methods.findFirst({
    where: and(
      eq(methods.id, methodId),
      or(eq(methods.userId, userId), eq(methods.isTemplate, true))
    ),
  });
}

export async function createMethod(data: NewMethod) {
  const [method] = await db.insert(methods).values(data).returning();
  return method;
}

export async function updateMethod(
  methodId: string,
  userId: string,
  data: Partial<NewMethod>
) {
  const [method] = await db
    .update(methods)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(methods.id, methodId), eq(methods.userId, userId)))
    .returning();
  return method;
}

export async function deleteMethod(methodId: string, userId: string) {
  await db
    .delete(methods)
    .where(and(eq(methods.id, methodId), eq(methods.userId, userId)));
}

// Create default methods for new users
export async function createDefaultMethods(userId: string) {
  const defaultMethods: NewMethod[] = [
    {
      userId,
      name: "Strategy Clarity Framework",
      description: "Business clarity → Demand → Swimlanes methodology",
      category: "strategy",
      steps: [
        {
          id: "1",
          title: "Business Clarity",
          description: "Define core business model and value proposition",
          order: 1,
          questions: [
            "What problem are you solving?",
            "Who is your ideal customer?",
            "What makes you different?",
          ],
        },
        {
          id: "2",
          title: "Demand Analysis",
          description: "Understand market demand and growth opportunities",
          order: 2,
          questions: [
            "Where does demand come from today?",
            "What are the growth levers?",
            "What's blocking growth?",
          ],
        },
        {
          id: "3",
          title: "Swimlane Definition",
          description: "Organize initiatives into parallel workstreams",
          order: 3,
          outputs: ["Swimlane diagram", "Priority matrix"],
        },
        {
          id: "4",
          title: "Execution Planning",
          description: "Define milestones and accountability",
          order: 4,
          outputs: ["90-day plan", "Weekly metrics"],
        },
      ] as MethodStep[],
    },
    {
      userId,
      name: "Sales Play Builder",
      description: "Create targeted sales plays and sequences",
      category: "sales",
      steps: [
        {
          id: "1",
          title: "ICP Definition",
          description: "Define ideal customer profile",
          order: 1,
        },
        {
          id: "2",
          title: "Pain Point Mapping",
          description: "Identify key pain points and triggers",
          order: 2,
        },
        {
          id: "3",
          title: "Messaging Framework",
          description: "Create value props and objection handling",
          order: 3,
        },
        {
          id: "4",
          title: "Sequence Design",
          description: "Build outreach sequences",
          order: 4,
        },
      ] as MethodStep[],
    },
    {
      userId,
      name: "Product Roadmap Designer",
      description: "Swimlane-based product roadmap with reasoning",
      category: "product",
      steps: [
        {
          id: "1",
          title: "Vision Alignment",
          description: "Align on product vision and goals",
          order: 1,
        },
        {
          id: "2",
          title: "Feature Inventory",
          description: "Catalog all potential features",
          order: 2,
        },
        {
          id: "3",
          title: "Prioritization",
          description: "Score and prioritize features",
          order: 3,
        },
        {
          id: "4",
          title: "Swimlane Organization",
          description: "Organize into parallel tracks",
          order: 4,
        },
      ] as MethodStep[],
    },
  ];

  return db.insert(methods).values(defaultMethods).returning();
}
