import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateText } from "ai";
import { models } from "@/lib/ai";
import { getExecutionPlan, updateExecutionPlan } from "@/lib/db/execution-plans";
import { getClient } from "@/lib/db/clients";
import { searchRelevantChunks } from "@/lib/rag";
import { ExecutionPlanSection, ExecutionPlanItem } from "@/db/schema";

export const dynamic = "force-dynamic";

const PLAN_GENERATION_PROMPT = `You are an expert execution planner helping a consultant build detailed tactical plans for their clients.

Given the objective and context, generate a detailed execution plan with:
1. Nested sections (use letters like (a), (b), (c))
2. Action items within each section
3. Sub-items where appropriate (for complex tasks)

Format your response as valid JSON matching this structure:
{
  "sections": [
    {
      "id": "unique-id",
      "title": "(a) Section Title",
      "order": 0,
      "items": [
        {
          "id": "unique-id",
          "text": "Action item text",
          "done": false,
          "order": 0,
          "children": [
            {
              "id": "unique-id",
              "text": "Sub-item text",
              "done": false,
              "order": 0
            }
          ]
        }
      ]
    }
  ],
  "suggestedNotes": "Any tools, lists, or extra considerations",
  "suggestedRules": ["Rule 1", "Rule 2"],
  "suggestedMetrics": {
    "quantitative": ["Metric 1", "Metric 2"],
    "qualitative": ["Metric 1", "Metric 2"]
  }
}

Be specific and actionable. Include dependencies and logical ordering.
Break down complex items into sub-items.
Think about what could go wrong and add items to prevent that.`;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const plan = await getExecutionPlan(params.id, user.id);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get client context
    const client = await getClient(plan.clientId, user.id);
    
    // Search for relevant source material
    let ragContext = "";
    try {
      const chunks = await searchRelevantChunks(
        plan.objective || plan.title,
        plan.clientId,
        user.id,
        5
      );
      if (chunks.length > 0) {
        ragContext = "\n\nRelevant context from client sources:\n" + 
          chunks.map(c => c.content).join("\n---\n");
      }
    } catch (e) {
      console.log("RAG search failed, continuing without context:", e);
    }

    // Build the prompt
    const contextParts = [
      `Client: ${client?.name || "Unknown"}${client?.company ? ` (${client.company})` : ""}`,
      `Objective: ${plan.objective || plan.title}`,
      plan.timeframe ? `Timeframe: ${plan.timeframe}` : null,
      plan.goal ? `Goal: ${plan.goal}` : null,
      ragContext,
    ].filter(Boolean).join("\n");

    const { text } = await generateText({
      model: models.default,
      system: PLAN_GENERATION_PROMPT,
      prompt: `Generate an execution plan for:\n\n${contextParts}`,
    });

    // Parse the AI response
    let generated;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const jsonStr = jsonMatch[1] || text;
      generated = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Ensure all items have proper IDs
    const ensureIds = (items: ExecutionPlanItem[]): ExecutionPlanItem[] => {
      return items.map((item, idx) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        order: item.order ?? idx,
        done: item.done ?? false,
        children: item.children ? ensureIds(item.children) : undefined,
      }));
    };

    const sections: ExecutionPlanSection[] = generated.sections.map(
      (section: ExecutionPlanSection, idx: number) => ({
        ...section,
        id: section.id || crypto.randomUUID(),
        order: section.order ?? idx,
        items: ensureIds(section.items || []),
      })
    );

    // Update the plan with generated content
    const updatedPlan = await updateExecutionPlan(params.id, user.id, {
      sections,
      notes: generated.suggestedNotes || plan.notes,
      rules: generated.suggestedRules || plan.rules,
      successMetrics: generated.suggestedMetrics || plan.successMetrics,
    });

    return NextResponse.json({
      plan: updatedPlan,
      generated: {
        sections,
        suggestedNotes: generated.suggestedNotes,
        suggestedRules: generated.suggestedRules,
        suggestedMetrics: generated.suggestedMetrics,
      },
    });
  } catch (error) {
    console.error("Failed to generate plan:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
