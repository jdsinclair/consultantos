import { db } from "@/db";
import { personas } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import type { NewPersona } from "@/db/schema";

export async function getPersonas(userId: string) {
  return db.query.personas.findMany({
    where: or(eq(personas.userId, userId), eq(personas.isDefault, true)),
    orderBy: [desc(personas.isDefault), personas.name],
  });
}

export async function getPersona(personaId: string, userId: string) {
  return db.query.personas.findFirst({
    where: and(
      eq(personas.id, personaId),
      or(eq(personas.userId, userId), eq(personas.isDefault, true))
    ),
  });
}

export async function createPersona(data: NewPersona) {
  const [persona] = await db.insert(personas).values(data).returning();
  return persona;
}

export async function updatePersona(
  personaId: string,
  userId: string,
  data: Partial<NewPersona>
) {
  const [persona] = await db
    .update(personas)
    .set(data)
    .where(and(eq(personas.id, personaId), eq(personas.userId, userId)))
    .returning();
  return persona;
}

export async function deletePersona(personaId: string, userId: string) {
  await db
    .delete(personas)
    .where(
      and(
        eq(personas.id, personaId),
        eq(personas.userId, userId),
        eq(personas.isDefault, false)
      )
    );
}

// Create default personas for new users
export async function createDefaultPersonas(userId: string) {
  const defaultPersonas: NewPersona[] = [
    {
      userId,
      name: "Strategy Advisor",
      description: "High-level strategic thinking and frameworks",
      icon: "target",
      temperature: 7,
      systemPrompt: `You are a senior strategy advisor with expertise in:
- Business strategy and market positioning
- Go-to-market planning
- Competitive analysis
- Strategic frameworks (Porter's, SWOT, Jobs-to-be-Done, etc.)

Provide high-level strategic guidance. Think in frameworks.
Challenge assumptions. Ask probing questions.
Always tie recommendations back to business outcomes.`,
    },
    {
      userId,
      name: "Sales Coach",
      description: "Sales methodology and deal strategy",
      icon: "trending-up",
      temperature: 6,
      systemPrompt: `You are an experienced sales coach with expertise in:
- Solution selling and consultative sales
- Objection handling
- Sales process optimization
- Pipeline management

Focus on practical, actionable sales advice.
Help with pitch refinement, messaging, and deal strategy.
Be direct about what works and what doesn't.`,
    },
    {
      userId,
      name: "Content Writer",
      description: "Copy, messaging, and marketing content",
      icon: "pen-tool",
      temperature: 8,
      systemPrompt: `You are a skilled content strategist and writer specializing in:
- B2B messaging and positioning
- Website copy and SEO
- Email sequences and nurture campaigns
- Thought leadership content

Write in a clear, compelling style.
Adapt tone to the audience.
Focus on value propositions and clear CTAs.`,
    },
    {
      userId,
      name: "Research Analyst",
      description: "Deep research and competitive intelligence",
      icon: "brain",
      temperature: 5,
      systemPrompt: `You are a research analyst specializing in:
- Market research and sizing
- Competitive intelligence
- Industry analysis
- Due diligence

Be thorough and cite sources when possible.
Present data objectively.
Highlight key insights and implications.`,
    },
  ];

  return db.insert(personas).values(defaultPersonas).returning();
}
