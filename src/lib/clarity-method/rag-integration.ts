// Clarity Method RAG Integration
// Serializes canvas data and pushes to RAG for searchable context

import { db } from "@/db";
import { sources, clarityMethodCanvases, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processSourceEmbeddings } from "@/lib/rag";
import {
  STRATEGIC_TRUTH_CONFIG,
  CORE_ENGINE_CONFIG,
  SWIMLANE_LABELS,
} from "./types";
import type {
  ClarityStrategicTruth,
  ClarityNorthStar,
  ClarityCoreEngine,
  ClarityValueExpansion,
  ClarityServiceProduct,
  ClarityParanoiaMap,
  ClarityStrategy,
  ClaritySwimlanes,
  ClarityMethodCanvas,
} from "@/db/schema";

// Use DB schema type which has Date fields
type CanvasData = Partial<ClarityMethodCanvas>;

const SOURCE_TYPE = "clarity_method";

/**
 * Serialize Strategic Truth section to searchable text
 */
function serializeStrategicTruth(data: ClarityStrategicTruth | null): string {
  if (!data) return "";

  const sections: string[] = [];

  const fields = [
    { key: "whoWeAre" as const, label: "Who We Are", config: STRATEGIC_TRUTH_CONFIG.whoWeAre },
    { key: "whatWeDo" as const, label: "What We Do", config: STRATEGIC_TRUTH_CONFIG.whatWeDo },
    { key: "whyWeWin" as const, label: "Why We Win", config: STRATEGIC_TRUTH_CONFIG.whyWeWin },
    { key: "whatWeAreNot" as const, label: "What We Are Not", config: STRATEGIC_TRUTH_CONFIG.whatWeAreNot },
    { key: "howWeDie" as const, label: "How We Die", config: STRATEGIC_TRUTH_CONFIG.howWeDie },
    { key: "theWedge" as const, label: "The Wedge", config: STRATEGIC_TRUTH_CONFIG.theWedge },
  ];

  for (const field of fields) {
    const box = data[field.key];
    if (box?.value?.trim()) {
      const status = box.status === "locked" ? " [LOCKED]" : "";
      sections.push(`${field.label}${status}: ${box.value}`);
      sections.push(`  Question answered: ${field.config.question}`);
    }
  }

  return sections.length > 0
    ? `## Strategic Truth (Business Identity)\n\n${sections.join("\n\n")}`
    : "";
}

/**
 * Serialize North Star constraints to searchable text
 */
function serializeNorthStar(data: ClarityNorthStar | null): string {
  if (!data) return "";

  const parts: string[] = [];

  if (data.revenueTarget?.trim()) {
    parts.push(`Revenue Target: ${data.revenueTarget}`);
  }
  if (data.marginFloor?.trim()) {
    parts.push(`Margin Floor: ${data.marginFloor}`);
  }
  if (data.founderRole?.trim()) {
    parts.push(`Founder Role Change (What they STOP doing): ${data.founderRole}`);
  }
  if (data.complexityCeiling?.trim()) {
    parts.push(`Complexity Ceiling: ${data.complexityCeiling}`);
  }

  return parts.length > 0
    ? `## North Star Constraints\n\n${parts.join("\n")}`
    : "";
}

/**
 * Serialize Core Engine diagnostic to searchable text
 */
function serializeCoreEngine(data: ClarityCoreEngine | null): string {
  if (!data) return "";

  const sections: string[] = [];

  const fields = [
    { key: "demand" as const, label: "Demand Source", config: CORE_ENGINE_CONFIG.demand },
    { key: "salesScoping" as const, label: "Sales & Scoping", config: CORE_ENGINE_CONFIG.salesScoping },
    { key: "delivery" as const, label: "Delivery", config: CORE_ENGINE_CONFIG.delivery },
    { key: "qualityControl" as const, label: "Quality Control", config: CORE_ENGINE_CONFIG.qualityControl },
    { key: "cashFlow" as const, label: "Cash Flow", config: CORE_ENGINE_CONFIG.cashFlow },
    { key: "marginByOffer" as const, label: "Margin by Offer", config: CORE_ENGINE_CONFIG.marginByOffer },
    { key: "teamLoad" as const, label: "Team Load", config: CORE_ENGINE_CONFIG.teamLoad },
  ];

  for (const field of fields) {
    const item = data[field.key];
    if (item?.answer?.trim()) {
      let text = `${field.label}: ${item.answer}`;
      if (item.warning) {
        text += ` [WARNING: ${item.warning}]`;
      }
      sections.push(text);
    }
  }

  if (data.primaryConstraint?.trim()) {
    sections.push(`\nPRIMARY CONSTRAINT (THE ONE): ${data.primaryConstraint}`);
  }

  return sections.length > 0
    ? `## Core Engine Diagnostic (Reality Check)\n\n${sections.join("\n")}`
    : "";
}

/**
 * Serialize Value Expansion Map to searchable text
 */
function serializeValueExpansion(data: ClarityValueExpansion | null): string {
  if (!data) return "";

  const columns = [
    { key: "left" as const, label: "Left (Adjacent)" },
    { key: "core" as const, label: "Core (Current)" },
    { key: "right" as const, label: "Right (Adjacent)" },
    { key: "vertical" as const, label: "Vertical (Up/Down Market)" },
  ];

  const parts: string[] = [];

  for (const col of columns) {
    const items = data[col.key]?.items || [];
    if (items.length > 0) {
      const itemTexts = items.map((item) => {
        const flags = [];
        if (item.isAttachable) flags.push("attachable");
        if (item.isRepeatable) flags.push("repeatable");
        if (item.improvesMargin) flags.push("margin+");
        const status = item.status === "parked" ? " (PARKED)" : "";
        return `  - ${item.name}${status}${flags.length > 0 ? ` [${flags.join(", ")}]` : ""}`;
      });
      parts.push(`${col.label}:\n${itemTexts.join("\n")}`);
    }
  }

  return parts.length > 0
    ? `## Value Expansion Map\n\n${parts.join("\n\n")}`
    : "";
}

/**
 * Serialize Service vs Product filter to searchable text
 */
function serializeServiceProduct(data: ClarityServiceProduct | null): string {
  if (!data) return "";

  const parts: string[] = [];

  if (data.customService?.length > 0) {
    parts.push(`Custom Services: ${data.customService.join(", ")}`);
  }
  if (data.productizedService?.length > 0) {
    parts.push(`Productized Services: ${data.productizedService.join(", ")}`);
  }
  if (data.productIP?.length > 0) {
    parts.push(`Product IP: ${data.productIP.join(", ")}`);
  }

  return parts.length > 0
    ? `## Service vs Product Classification\n\n${parts.join("\n")}`
    : "";
}

/**
 * Serialize Kill List to searchable text
 */
function serializeKillList(data: string[] | null): string {
  if (!data || data.length === 0) return "";

  return `## Kill List (Will NOT Do)\n\n${data.map((item) => `- ${item}`).join("\n")}`;
}

/**
 * Serialize Paranoia Map to searchable text
 */
function serializeParanoiaMap(data: ClarityParanoiaMap | null): string {
  if (!data) return "";

  const parts: string[] = [];

  if (data.ai?.trim()) {
    parts.push(`AI Threat: ${data.ai}`);
  }
  if (data.inHouse?.trim()) {
    parts.push(`In-House Threat: ${data.inHouse}`);
  }
  if (data.priceCompression?.trim()) {
    parts.push(`Price Compression Threat: ${data.priceCompression}`);
  }
  if (data.speedCommoditization?.trim()) {
    parts.push(`Speed Commoditization Threat: ${data.speedCommoditization}`);
  }
  if (data.other?.length > 0) {
    parts.push(`Other Threats:\n${data.other.map((t) => `  - ${t}`).join("\n")}`);
  }

  return parts.length > 0
    ? `## Paranoia Map (Existential Threats)\n\n${parts.join("\n")}`
    : "";
}

/**
 * Serialize Strategy section to searchable text
 */
function serializeStrategy(data: ClarityStrategy | null): string {
  if (!data) return "";

  const parts: string[] = [];

  if (data.core?.trim()) {
    parts.push(`Core Strategy: ${data.core}`);
  }
  if (data.expansion?.trim()) {
    parts.push(`Expansion Strategy: ${data.expansion}`);
  }
  if (data.orgShift?.trim()) {
    parts.push(`Org Shift: ${data.orgShift}`);
  }
  if (data.founderRole?.trim()) {
    parts.push(`Founder Role Evolution: ${data.founderRole}`);
  }
  if (data.topRisks?.length > 0) {
    parts.push(`Top Risks:\n${data.topRisks.map((r) => `  - ${r}`).join("\n")}`);
  }

  return parts.length > 0
    ? `## Strategy Summary\n\n${parts.join("\n\n")}`
    : "";
}

/**
 * Serialize Execution Swimlanes to searchable text
 */
function serializeSwimlanes(data: ClaritySwimlanes | null): string {
  if (!data) return "";

  const swimlaneKeys = Object.keys(SWIMLANE_LABELS) as Array<keyof typeof SWIMLANE_LABELS>;
  const parts: string[] = [];

  // Helper to get items from both new and legacy format
  const getItems = (tf: any): string[] => {
    if (!tf) return [];
    if (Array.isArray(tf)) return tf;
    return tf.items || [];
  };
  
  const getObjective = (tf: any): string => {
    if (!tf || Array.isArray(tf)) return '';
    return tf.objective || '';
  };

  for (const key of swimlaneKeys) {
    const lane = data[key];
    if (!lane) continue;

    const shortItems = getItems(lane.short);
    const midItems = getItems(lane.mid);
    const longItems = getItems(lane.long);

    const hasContent = shortItems.length > 0 || midItems.length > 0 || longItems.length > 0;

    if (hasContent) {
      const label = SWIMLANE_LABELS[key];
      const timeframes: string[] = [];

      if (shortItems.length > 0) {
        const obj = getObjective(lane.short);
        timeframes.push(`  Short-term (0-90 days)${obj ? ` [${obj}]` : ''}: ${shortItems.join("; ")}`);
      }
      if (midItems.length > 0) {
        const obj = getObjective(lane.mid);
        timeframes.push(`  Mid-term (3-12 months)${obj ? ` [${obj}]` : ''}: ${midItems.join("; ")}`);
      }
      if (longItems.length > 0) {
        const obj = getObjective(lane.long);
        timeframes.push(`  Long-term (12-24 months)${obj ? ` [${obj}]` : ''}: ${longItems.join("; ")}`);
      }

      parts.push(`${label}:\n${timeframes.join("\n")}`);
    }
  }

  return parts.length > 0
    ? `## Execution Swimlanes (Roadmap)\n\n${parts.join("\n\n")}`
    : "";
}

/**
 * Convert entire Clarity Method canvas to searchable text
 */
export function serializeCanvasToText(canvas: CanvasData, clientName?: string): string {
  const sections: string[] = [];

  // Header
  const header = clientName
    ? `# Clarity Method Canvas: ${clientName}`
    : "# Clarity Method Canvas";
  sections.push(header);

  if (canvas.phase) {
    sections.push(`Phase: ${canvas.phase.toUpperCase()}`);
  }

  // Serialize each section
  const strategicTruth = serializeStrategicTruth(canvas.strategicTruth ?? null);
  if (strategicTruth) sections.push(strategicTruth);

  const northStar = serializeNorthStar(canvas.northStar ?? null);
  if (northStar) sections.push(northStar);

  const coreEngine = serializeCoreEngine(canvas.coreEngine ?? null);
  if (coreEngine) sections.push(coreEngine);

  const valueExpansion = serializeValueExpansion(canvas.valueExpansion ?? null);
  if (valueExpansion) sections.push(valueExpansion);

  const serviceProduct = serializeServiceProduct(canvas.serviceProductFilter ?? null);
  if (serviceProduct) sections.push(serviceProduct);

  const killList = serializeKillList(canvas.killList ?? null);
  if (killList) sections.push(killList);

  const paranoiaMap = serializeParanoiaMap(canvas.paranoiaMap ?? null);
  if (paranoiaMap) sections.push(paranoiaMap);

  const strategy = serializeStrategy(canvas.strategy ?? null);
  if (strategy) sections.push(strategy);

  const swimlanes = serializeSwimlanes(canvas.swimlanes ?? null);
  if (swimlanes) sections.push(swimlanes);

  return sections.join("\n\n---\n\n");
}

/**
 * Check if canvas has meaningful content worth indexing
 */
export function canvasHasContent(canvas: CanvasData): boolean {
  // Check Strategic Truth
  if (canvas.strategicTruth) {
    const st = canvas.strategicTruth;
    if (
      st.whoWeAre?.value?.trim() ||
      st.whatWeDo?.value?.trim() ||
      st.whyWeWin?.value?.trim() ||
      st.whatWeAreNot?.value?.trim() ||
      st.howWeDie?.value?.trim() ||
      st.theWedge?.value?.trim()
    ) {
      return true;
    }
  }

  // Check North Star
  if (canvas.northStar) {
    const ns = canvas.northStar;
    if (
      ns.revenueTarget?.trim() ||
      ns.marginFloor?.trim() ||
      ns.founderRole?.trim() ||
      ns.complexityCeiling?.trim()
    ) {
      return true;
    }
  }

  // Check Core Engine
  if (canvas.coreEngine) {
    const ce = canvas.coreEngine;
    if (
      ce.demand?.answer?.trim() ||
      ce.salesScoping?.answer?.trim() ||
      ce.delivery?.answer?.trim() ||
      ce.primaryConstraint?.trim()
    ) {
      return true;
    }
  }

  // Check Strategy
  if (canvas.strategy) {
    const s = canvas.strategy;
    if (
      s.core?.trim() ||
      s.expansion?.trim() ||
      s.orgShift?.trim() ||
      s.founderRole?.trim()
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get or create the Clarity Method source for a client
 */
async function getOrCreateClarityMethodSource(
  clientId: string,
  userId: string,
  clientName: string
): Promise<string> {
  // Check for existing source
  const existing = await db.query.sources.findFirst({
    where: and(
      eq(sources.clientId, clientId),
      eq(sources.userId, userId),
      eq(sources.type, SOURCE_TYPE)
    ),
  });

  if (existing) {
    return existing.id;
  }

  // Create new source
  const [newSource] = await db
    .insert(sources)
    .values({
      clientId,
      userId,
      type: SOURCE_TYPE,
      name: `Clarity Method Canvas - ${clientName}`,
      originalName: "clarity-method-canvas",
      processingStatus: "pending",
    })
    .returning();

  return newSource.id;
}

/**
 * Push Clarity Method canvas to RAG
 * Creates/updates a source and processes embeddings
 */
export async function pushCanvasToRAG(
  clientId: string,
  userId: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    // Get canvas and client
    const [canvas, client] = await Promise.all([
      db.query.clarityMethodCanvases.findFirst({
        where: and(
          eq(clarityMethodCanvases.clientId, clientId),
          eq(clarityMethodCanvases.userId, userId)
        ),
      }),
      db.query.clients.findFirst({
        where: and(eq(clients.id, clientId), eq(clients.userId, userId)),
      }),
    ]);

    if (!canvas) {
      return { success: false, error: "Canvas not found" };
    }

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Check if canvas has content worth indexing
    if (!canvasHasContent(canvas)) {
      console.log(`[ClarityMethod RAG] Canvas for ${client.name} has no meaningful content, skipping`);
      return { success: true, sourceId: undefined };
    }

    // Serialize canvas to text
    const content = serializeCanvasToText(canvas, client.name);

    // Get or create source
    const sourceId = await getOrCreateClarityMethodSource(clientId, userId, client.name);

    // Update source with content
    await db
      .update(sources)
      .set({
        content,
        processingStatus: "processing",
        updatedAt: new Date(),
        aiSummary: {
          whatItIs: "Strategic diagnostic canvas from the Clarity Method framework",
          whyItMatters: `Defines ${client.name}'s business identity, constraints, primary bottleneck, and execution roadmap`,
          keyInsights: [
            canvas.coreEngine?.primaryConstraint
              ? `Primary Constraint: ${canvas.coreEngine.primaryConstraint}`
              : "Primary constraint not yet identified",
            canvas.strategicTruth?.theWedge?.value
              ? `Wedge: ${canvas.strategicTruth.theWedge.value}`
              : "Wedge not yet defined",
          ],
          suggestedUses: [
            "Reference for strategic decisions",
            "Context for action item prioritization",
            "Baseline for progress tracking",
          ],
          generatedAt: new Date().toISOString(),
        },
      })
      .where(eq(sources.id, sourceId));

    // Process embeddings
    await processSourceEmbeddings(
      sourceId,
      clientId,
      userId,
      false,
      content,
      {
        sourceType: SOURCE_TYPE,
        phase: canvas.phase,
        updatedAt: canvas.updatedAt?.toISOString(),
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

    console.log(`[ClarityMethod RAG] Successfully indexed canvas for ${client.name} (source: ${sourceId})`);

    return { success: true, sourceId };
  } catch (error) {
    console.error("[ClarityMethod RAG] Error pushing canvas to RAG:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build chat context string from canvas (for direct injection)
 * This is a lighter version than full RAG - used for immediate context
 */
export function buildCanvasContext(canvas: CanvasData): string {
  if (!canvasHasContent(canvas)) {
    return "";
  }

  const parts: string[] = ["## Clarity Method Canvas (Strategic Framework)"];

  // Strategic Truth (abbreviated)
  if (canvas.strategicTruth) {
    const st = canvas.strategicTruth;
    const truthParts: string[] = [];
    if (st.whoWeAre?.value?.trim()) truthParts.push(`Who We Are: ${st.whoWeAre.value}`);
    if (st.whatWeDo?.value?.trim()) truthParts.push(`What We Do: ${st.whatWeDo.value}`);
    if (st.whyWeWin?.value?.trim()) truthParts.push(`Why We Win: ${st.whyWeWin.value}`);
    if (st.theWedge?.value?.trim()) truthParts.push(`The Wedge: ${st.theWedge.value}`);
    if (st.howWeDie?.value?.trim()) truthParts.push(`How We Die: ${st.howWeDie.value}`);
    if (truthParts.length > 0) {
      parts.push(`**Strategic Truth:**\n${truthParts.join("\n")}`);
    }
  }

  // North Star (abbreviated)
  if (canvas.northStar) {
    const ns = canvas.northStar;
    const nsParts: string[] = [];
    if (ns.revenueTarget?.trim()) nsParts.push(`Revenue Target: ${ns.revenueTarget}`);
    if (ns.marginFloor?.trim()) nsParts.push(`Margin Floor: ${ns.marginFloor}`);
    if (ns.founderRole?.trim()) nsParts.push(`Founder Role: ${ns.founderRole}`);
    if (nsParts.length > 0) {
      parts.push(`**North Star Constraints:**\n${nsParts.join("\n")}`);
    }
  }

  // Primary Constraint (critical)
  if (canvas.coreEngine?.primaryConstraint?.trim()) {
    parts.push(`**PRIMARY CONSTRAINT:** ${canvas.coreEngine.primaryConstraint}`);
  }

  // Strategy summary
  if (canvas.strategy) {
    const s = canvas.strategy;
    const stratParts: string[] = [];
    if (s.core?.trim()) stratParts.push(`Core: ${s.core}`);
    if (s.expansion?.trim()) stratParts.push(`Expansion: ${s.expansion}`);
    if (stratParts.length > 0) {
      parts.push(`**Strategy:**\n${stratParts.join("\n")}`);
    }
  }

  // Kill List
  if (canvas.killList && canvas.killList.length > 0) {
    parts.push(`**Kill List (Will NOT do):** ${canvas.killList.join(", ")}`);
  }

  return parts.join("\n\n");
}
