// Methods RAG Integration
// Serializes Execution Plans and Roadmaps to RAG for searchable context

import { db } from "@/db";
import { sources, executionPlans, roadmaps, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processSourceEmbeddings } from "@/lib/rag";
import type {
  ExecutionPlan,
  ExecutionPlanSection,
  ExecutionPlanItem,
  Roadmap,
  RoadmapItem,
  RoadmapSwimlane,
  RoadmapBacklogItem,
} from "@/db/schema";

const EXECUTION_PLAN_SOURCE_TYPE = "execution_plan";
const ROADMAP_SOURCE_TYPE = "roadmap";

// ============================================================================
// EXECUTION PLAN SERIALIZATION
// ============================================================================

/**
 * Serialize a single section of an execution plan
 */
function serializeSection(section: ExecutionPlanSection, depth = 0): string {
  const indent = "  ".repeat(depth);
  const parts: string[] = [];

  // Section header
  let header = `${indent}### ${section.title}`;
  if (section.status) {
    header += ` [${section.status.toUpperCase()}]`;
  }
  parts.push(header);

  // Section metadata
  if (section.objective) {
    parts.push(`${indent}Objective: ${section.objective}`);
  }
  if (section.goal) {
    parts.push(`${indent}Goal: ${section.goal}`);
  }
  if (section.why) {
    parts.push(`${indent}Why: ${section.why}`);
  }
  if (section.what) {
    parts.push(`${indent}What: ${section.what}`);
  }
  if (section.notes) {
    parts.push(`${indent}Notes: ${section.notes}`);
  }

  // Success metrics
  if (section.successMetrics) {
    const metrics = section.successMetrics;
    if (metrics.quantitative?.length) {
      parts.push(`${indent}Quantitative Metrics: ${metrics.quantitative.join("; ")}`);
    }
    if (metrics.qualitative?.length) {
      parts.push(`${indent}Qualitative Metrics: ${metrics.qualitative.join("; ")}`);
    }
  }

  // Rules
  if (section.rules?.length) {
    parts.push(`${indent}Rules: ${section.rules.join("; ")}`);
  }

  // Items (action items / tasks)
  if (section.items?.length) {
    parts.push(`${indent}Items:`);
    for (const item of section.items) {
      parts.push(serializeItem(item, depth + 1));
    }
  }

  return parts.join("\n");
}

/**
 * Serialize a single item (task) recursively
 */
function serializeItem(item: ExecutionPlanItem, depth = 1): string {
  const indent = "  ".repeat(depth);
  const parts: string[] = [];

  let line = `${indent}- ${item.text}`;
  if (item.done) {
    line += ` [DONE]`;
  }
  if (item.priority) {
    line += ` [${item.priority}]`;
  }
  if (item.assignee) {
    line += ` (${item.assignee})`;
  }
  if (item.dueDate) {
    line += ` due: ${item.dueDate}`;
  }
  parts.push(line);

  if (item.notes) {
    parts.push(`${indent}  Notes: ${item.notes}`);
  }
  if (item.blockedBy) {
    parts.push(`${indent}  Blocked by: ${item.blockedBy}`);
  }

  // Nested children
  if (item.children?.length) {
    for (const child of item.children) {
      parts.push(serializeItem(child, depth + 1));
    }
  }

  return parts.join("\n");
}

/**
 * Serialize an execution plan to searchable text
 */
export function serializeExecutionPlanToText(
  plan: ExecutionPlan,
  clientName?: string
): string {
  const sections: string[] = [];

  // Header
  const header = clientName
    ? `# Execution Plan: ${plan.title}\nClient: ${clientName}`
    : `# Execution Plan: ${plan.title}`;
  sections.push(header);

  // Status & timeframe
  const meta: string[] = [];
  if (plan.status) meta.push(`Status: ${plan.status}`);
  if (plan.timeframe) meta.push(`Timeframe: ${plan.timeframe}`);
  if (plan.startDate) meta.push(`Start: ${new Date(plan.startDate).toLocaleDateString()}`);
  if (plan.targetDate) meta.push(`Target: ${new Date(plan.targetDate).toLocaleDateString()}`);
  if (meta.length) sections.push(meta.join(" | "));

  // Objective & Goal
  if (plan.objective) {
    sections.push(`## Objective\n${plan.objective}`);
  }
  if (plan.goal) {
    sections.push(`## Goal (Success Looks Like)\n${plan.goal}`);
  }

  // Success Metrics
  if (plan.successMetrics) {
    const metrics: string[] = ["## Success Metrics"];
    if (plan.successMetrics.quantitative?.length) {
      metrics.push(`Quantitative:\n${plan.successMetrics.quantitative.map(m => `- ${m}`).join("\n")}`);
    }
    if (plan.successMetrics.qualitative?.length) {
      metrics.push(`Qualitative:\n${plan.successMetrics.qualitative.map(m => `- ${m}`).join("\n")}`);
    }
    if (metrics.length > 1) sections.push(metrics.join("\n"));
  }

  // Rules
  if (plan.rules?.length) {
    sections.push(`## Rules / Constraints\n${plan.rules.map(r => `- ${r}`).join("\n")}`);
  }

  // Sections (the actual plan content)
  if (plan.sections?.length) {
    sections.push("## Plan Sections");
    for (const section of plan.sections) {
      sections.push(serializeSection(section));
    }
  }

  // Notes
  if (plan.notes) {
    sections.push(`## Notes\n${plan.notes}`);
  }

  // Source reference
  if (plan.sourceSwimlanelKey) {
    sections.push(`## Source\nFrom Clarity Method swimlane: ${plan.sourceSwimlanelKey} (${plan.sourceTimeframe || "unspecified"} term)`);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Check if execution plan has meaningful content worth indexing
 */
export function executionPlanHasContent(plan: ExecutionPlan): boolean {
  // Must have a title
  if (!plan.title?.trim()) return false;

  // Check for any content
  if (plan.objective?.trim()) return true;
  if (plan.goal?.trim()) return true;
  if (plan.notes?.trim()) return true;

  // Check sections
  if (plan.sections?.length) {
    for (const section of plan.sections) {
      if (section.items?.length) return true;
      if (section.objective?.trim()) return true;
      if (section.goal?.trim()) return true;
    }
  }

  return false;
}

// ============================================================================
// ROADMAP SERIALIZATION
// ============================================================================

/**
 * Serialize a roadmap item
 */
function serializeRoadmapItem(item: RoadmapItem, swimlaneLabel?: string): string {
  const parts: string[] = [];

  let line = `- **${item.title}**`;
  if (item.status) line += ` [${item.status}]`;
  if (item.size) line += ` (${item.size.toUpperCase()})`;
  parts.push(line);

  if (swimlaneLabel) {
    parts.push(`  Swimlane: ${swimlaneLabel}`);
  }
  parts.push(`  Timeframe: ${item.timeframe}`);

  if (item.description) {
    parts.push(`  Description: ${item.description}`);
  }
  if (item.why) {
    parts.push(`  Why: ${item.why}`);
  }
  if (item.successCriteria) {
    parts.push(`  Success Criteria: ${item.successCriteria}`);
  }
  if (item.notes) {
    parts.push(`  Notes: ${item.notes}`);
  }

  // Metrics
  if (item.metrics) {
    const m = item.metrics;
    const metricParts: string[] = [];
    if (m.impact) metricParts.push(`Impact: ${m.impact}`);
    if (m.effort) metricParts.push(`Effort: ${m.effort}`);
    if (m.confidence) metricParts.push(`Confidence: ${m.confidence}%`);
    if (m.roi) metricParts.push(`ROI: ${m.roi}`);
    if (metricParts.length) {
      parts.push(`  Metrics: ${metricParts.join(", ")}`);
    }
  }

  // Risks & dependencies
  if (item.risks?.length) {
    parts.push(`  Risks: ${item.risks.join("; ")}`);
  }
  if (item.dependencies?.length) {
    parts.push(`  Dependencies: ${item.dependencies.join(", ")}`);
  }

  // Subtasks
  if (item.subtasks?.length) {
    const completed = item.subtasks.filter(s => s.done).length;
    parts.push(`  Subtasks: ${completed}/${item.subtasks.length} done`);
    for (const st of item.subtasks) {
      parts.push(`    ${st.done ? "[x]" : "[ ]"} ${st.title}`);
    }
  }

  return parts.join("\n");
}

/**
 * Serialize a roadmap to searchable text
 */
export function serializeRoadmapToText(
  roadmap: Roadmap,
  clientName?: string
): string {
  const sections: string[] = [];

  // Header
  const header = clientName
    ? `# Roadmap: ${roadmap.title}\nClient: ${clientName}`
    : `# Roadmap: ${roadmap.title}`;
  sections.push(header);

  // Meta
  const meta: string[] = [];
  if (roadmap.status) meta.push(`Status: ${roadmap.status}`);
  if (roadmap.planningHorizon) meta.push(`Planning Horizon: ${roadmap.planningHorizon}`);
  if (meta.length) sections.push(meta.join(" | "));

  // Vision & Objective
  if (roadmap.vision) {
    sections.push(`## Vision\n${roadmap.vision}`);
  }
  if (roadmap.objective) {
    sections.push(`## Objective\n${roadmap.objective}`);
  }

  // Success Metrics
  if (roadmap.successMetrics) {
    const metrics: string[] = ["## Success Metrics"];
    if (roadmap.successMetrics.quantitative?.length) {
      metrics.push(`Quantitative:\n${roadmap.successMetrics.quantitative.map(m => `- ${m}`).join("\n")}`);
    }
    if (roadmap.successMetrics.qualitative?.length) {
      metrics.push(`Qualitative:\n${roadmap.successMetrics.qualitative.map(m => `- ${m}`).join("\n")}`);
    }
    if (metrics.length > 1) sections.push(metrics.join("\n"));
  }

  // Build swimlane lookup
  const swimlaneLookup: Record<string, string> = {};
  if (roadmap.swimlanes?.length) {
    for (const sl of roadmap.swimlanes) {
      swimlaneLookup[sl.key] = sl.label;
    }
  }

  // Items by timeframe
  if (roadmap.items?.length) {
    const timeframes = ['now', 'next', 'later', 'someday'] as const;
    const timeframeLabels: Record<string, string> = {
      now: "Now (Current Sprint)",
      next: "Next (Upcoming)",
      later: "Later (Future)",
      someday: "Someday (Backlog Ideas)"
    };

    for (const tf of timeframes) {
      const tfItems = roadmap.items.filter(i => i.timeframe === tf);
      if (tfItems.length > 0) {
        const tfSection: string[] = [`## ${timeframeLabels[tf]}`];

        // Group by swimlane
        const bySwim: Record<string, RoadmapItem[]> = {};
        for (const item of tfItems) {
          const key = item.swimlaneKey || "uncategorized";
          if (!bySwim[key]) bySwim[key] = [];
          bySwim[key].push(item);
        }

        for (const [swimKey, items] of Object.entries(bySwim)) {
          const swimLabel = swimlaneLookup[swimKey] || swimKey;
          tfSection.push(`\n### ${swimLabel}`);
          for (const item of items) {
            tfSection.push(serializeRoadmapItem(item));
          }
        }

        sections.push(tfSection.join("\n"));
      }
    }
  }

  // Backlog
  if (roadmap.backlog?.length) {
    const backlogSection: string[] = ["## Backlog (Unsorted Ideas)"];
    for (const item of roadmap.backlog) {
      let line = `- ${item.title}`;
      if (item.suggestedSwimlane) {
        const label = swimlaneLookup[item.suggestedSwimlane] || item.suggestedSwimlane;
        line += ` → suggested for ${label}`;
      }
      if (item.suggestedTimeframe) {
        line += ` (${item.suggestedTimeframe})`;
      }
      backlogSection.push(line);
      if (item.description) {
        backlogSection.push(`  ${item.description}`);
      }
      if (item.notes) {
        backlogSection.push(`  Notes: ${item.notes}`);
      }
    }
    sections.push(backlogSection.join("\n"));
  }

  // Notes
  if (roadmap.notes) {
    sections.push(`## Notes\n${roadmap.notes}`);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Check if roadmap has meaningful content worth indexing
 */
export function roadmapHasContent(roadmap: Roadmap): boolean {
  if (!roadmap.title?.trim()) return false;
  if (roadmap.vision?.trim()) return true;
  if (roadmap.objective?.trim()) return true;
  if (roadmap.items?.length) return true;
  if (roadmap.backlog?.length) return true;
  return false;
}

// ============================================================================
// SOURCE MANAGEMENT
// ============================================================================

/**
 * Get or create a source for a method (execution plan or roadmap)
 */
async function getOrCreateMethodSource(
  clientId: string,
  userId: string,
  methodId: string,
  methodType: "execution_plan" | "roadmap",
  methodTitle: string,
  clientName: string
): Promise<string> {
  const sourceType = methodType === "execution_plan" ? EXECUTION_PLAN_SOURCE_TYPE : ROADMAP_SOURCE_TYPE;
  const sourceName = methodType === "execution_plan"
    ? `Execution Plan: ${methodTitle}`
    : `Roadmap: ${methodTitle}`;

  // Check for existing source (by method reference in metadata or by exact name match)
  const existing = await db.query.sources.findFirst({
    where: and(
      eq(sources.clientId, clientId),
      eq(sources.userId, userId),
      eq(sources.type, sourceType),
      eq(sources.originalName, methodId) // Use originalName to store methodId for lookup
    ),
  });

  if (existing) {
    // Update name if title changed
    if (existing.name !== sourceName) {
      await db.update(sources)
        .set({ name: sourceName, updatedAt: new Date() })
        .where(eq(sources.id, existing.id));
    }
    return existing.id;
  }

  // Create new source
  const [newSource] = await db
    .insert(sources)
    .values({
      clientId,
      userId,
      type: sourceType,
      name: sourceName,
      originalName: methodId, // Store methodId for future lookups
      processingStatus: "pending",
      // Store link URL for citations
      url: methodType === "execution_plan"
        ? `/methods/do-the-thing/${methodId}`
        : `/methods/roadmap/${methodId}`,
    })
    .returning();

  return newSource.id;
}

// ============================================================================
// PUSH TO RAG
// ============================================================================

/**
 * Push an execution plan to RAG
 */
export async function pushExecutionPlanToRAG(
  planId: string,
  userId: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    // Get plan and client
    const plan = await db.query.executionPlans.findFirst({
      where: and(
        eq(executionPlans.id, planId),
        eq(executionPlans.userId, userId)
      ),
      with: { client: true },
    });

    if (!plan) {
      return { success: false, error: "Execution plan not found" };
    }

    if (!plan.client) {
      return { success: false, error: "Client not found" };
    }

    // Check if plan has content worth indexing
    if (!executionPlanHasContent(plan)) {
      console.log(`[ExecutionPlan RAG] Plan "${plan.title}" has no meaningful content, skipping`);
      return { success: true, sourceId: undefined };
    }

    // Serialize plan to text
    const content = serializeExecutionPlanToText(plan, plan.client.name);

    // Get or create source
    const sourceId = await getOrCreateMethodSource(
      plan.clientId,
      userId,
      plan.id,
      "execution_plan",
      plan.title,
      plan.client.name
    );

    // Update source with content
    await db
      .update(sources)
      .set({
        content,
        processingStatus: "processing",
        updatedAt: new Date(),
        url: `/methods/do-the-thing/${plan.id}`, // Update link for citations
        aiSummary: {
          whatItIs: `Execution plan: "${plan.title}" - a tactical action plan with specific tasks and milestones`,
          whyItMatters: `Defines the step-by-step execution strategy for ${plan.client.name}${plan.timeframe ? ` over ${plan.timeframe}` : ""}`,
          keyInsights: [
            plan.objective ? `Objective: ${plan.objective}` : "Objective not yet defined",
            plan.goal ? `Goal: ${plan.goal}` : "Success goal not yet defined",
            `Status: ${plan.status || "draft"}`,
          ],
          suggestedUses: [
            "Reference for task prioritization",
            "Track execution progress",
            "Context for related discussions",
          ],
          generatedAt: new Date().toISOString(),
        },
      })
      .where(eq(sources.id, sourceId));

    // Process embeddings
    await processSourceEmbeddings(
      sourceId,
      plan.clientId,
      userId,
      false,
      content,
      {
        sourceType: EXECUTION_PLAN_SOURCE_TYPE,
        methodId: plan.id,
        methodTitle: plan.title,
        status: plan.status,
        timeframe: plan.timeframe,
        linkUrl: `/methods/do-the-thing/${plan.id}`,
      }
    );

    // Mark as completed
    await db
      .update(sources)
      .set({
        processingStatus: "completed",
        lastSyncedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));

    console.log(`[ExecutionPlan RAG] Successfully indexed "${plan.title}" for ${plan.client.name} (source: ${sourceId})`);

    return { success: true, sourceId };
  } catch (error) {
    console.error("[ExecutionPlan RAG] Error pushing to RAG:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Push a roadmap to RAG
 */
export async function pushRoadmapToRAG(
  roadmapId: string,
  userId: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    // Get roadmap and client
    const roadmap = await db.query.roadmaps.findFirst({
      where: and(
        eq(roadmaps.id, roadmapId),
        eq(roadmaps.userId, userId)
      ),
      with: { client: true },
    });

    if (!roadmap) {
      return { success: false, error: "Roadmap not found" };
    }

    if (!roadmap.client) {
      return { success: false, error: "Client not found" };
    }

    // Check if roadmap has content worth indexing
    if (!roadmapHasContent(roadmap)) {
      console.log(`[Roadmap RAG] Roadmap "${roadmap.title}" has no meaningful content, skipping`);
      return { success: true, sourceId: undefined };
    }

    // Serialize roadmap to text
    const content = serializeRoadmapToText(roadmap, roadmap.client.name);

    // Get or create source
    const sourceId = await getOrCreateMethodSource(
      roadmap.clientId,
      userId,
      roadmap.id,
      "roadmap",
      roadmap.title,
      roadmap.client.name
    );

    // Count items by status for insights
    const itemCounts = {
      total: roadmap.items?.length || 0,
      done: roadmap.items?.filter(i => i.status === "done").length || 0,
      inProgress: roadmap.items?.filter(i => i.status === "in_progress").length || 0,
    };

    // Update source with content
    await db
      .update(sources)
      .set({
        content,
        processingStatus: "processing",
        updatedAt: new Date(),
        url: `/methods/roadmap/${roadmap.id}`, // Update link for citations
        aiSummary: {
          whatItIs: `Product roadmap: "${roadmap.title}" - a visual plan of features and initiatives`,
          whyItMatters: `Maps out the product/service evolution for ${roadmap.client.name}${roadmap.planningHorizon ? ` (${roadmap.planningHorizon} horizon)` : ""}`,
          keyInsights: [
            roadmap.vision ? `Vision: ${roadmap.vision}` : "Vision not yet defined",
            roadmap.objective ? `Objective: ${roadmap.objective}` : "Objective not yet defined",
            `${itemCounts.total} items (${itemCounts.done} done, ${itemCounts.inProgress} in progress)`,
          ],
          suggestedUses: [
            "Reference for product decisions",
            "Track feature progress",
            "Prioritization discussions",
          ],
          generatedAt: new Date().toISOString(),
        },
      })
      .where(eq(sources.id, sourceId));

    // Process embeddings
    await processSourceEmbeddings(
      sourceId,
      roadmap.clientId,
      userId,
      false,
      content,
      {
        sourceType: ROADMAP_SOURCE_TYPE,
        methodId: roadmap.id,
        methodTitle: roadmap.title,
        status: roadmap.status,
        planningHorizon: roadmap.planningHorizon,
        linkUrl: `/methods/roadmap/${roadmap.id}`,
      }
    );

    // Mark as completed
    await db
      .update(sources)
      .set({
        processingStatus: "completed",
        lastSyncedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));

    console.log(`[Roadmap RAG] Successfully indexed "${roadmap.title}" for ${roadmap.client.name} (source: ${sourceId})`);

    return { success: true, sourceId };
  } catch (error) {
    console.error("[Roadmap RAG] Error pushing to RAG:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a method source from RAG when the method is deleted
 */
export async function deleteMethodSource(
  methodId: string,
  userId: string,
  methodType: "execution_plan" | "roadmap"
): Promise<void> {
  const sourceType = methodType === "execution_plan" ? EXECUTION_PLAN_SOURCE_TYPE : ROADMAP_SOURCE_TYPE;

  try {
    // Find and delete the source
    const source = await db.query.sources.findFirst({
      where: and(
        eq(sources.userId, userId),
        eq(sources.type, sourceType),
        eq(sources.originalName, methodId)
      ),
    });

    if (source) {
      await db.delete(sources).where(eq(sources.id, source.id));
      console.log(`[Methods RAG] Deleted source for ${methodType} ${methodId}`);
    }
  } catch (error) {
    console.error(`[Methods RAG] Error deleting source for ${methodType}:`, error);
  }
}
