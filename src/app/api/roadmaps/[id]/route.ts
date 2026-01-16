import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import {
  getRoadmap,
  updateRoadmap,
  deleteRoadmap,
} from "@/lib/db/roadmaps";
import { pushRoadmapToRAG, deleteMethodSource } from "@/lib/methods/rag-integration";

export const dynamic = "force-dynamic";

// Tag schema
const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

// Subtask schema
const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

// Item schema
const roadmapItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  swimlaneKey: z.string(),
  timeframe: z.enum(['now', 'next', 'later', 'someday']),
  order: z.number(),
  status: z.enum(['idea', 'planned', 'in_progress', 'done', 'blocked', 'cut']),
  size: z.enum(['xs', 's', 'm', 'l', 'xl']).optional(),
  metrics: z.object({
    effort: z.string().optional(),
    impact: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    confidence: z.number().optional(),
    roi: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  why: z.string().optional(),
  successCriteria: z.string().optional(),
  risks: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  links: z.array(z.object({
    id: z.string(),
    type: z.enum(['prototype', 'prd', 'design', 'doc', 'jira', 'github', 'figma', 'other']),
    url: z.string(),
    title: z.string().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(subtaskSchema).optional(),
  source: z.enum(['manual', 'ai', 'import']).optional(),
  sourceContext: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Backlog item schema
const backlogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
  suggestedSwimlane: z.string().optional(),
  suggestedTimeframe: z.enum(['now', 'next', 'later', 'someday']).optional(),
  suggestedSize: z.enum(['xs', 's', 'm', 'l', 'xl']).optional(),
  suggestedImpact: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.enum(['manual', 'ai', 'import']).optional(),
  sourceContext: z.string().optional(),
  links: z.array(z.object({
    id: z.string(),
    type: z.enum(['prototype', 'prd', 'design', 'doc', 'jira', 'github', 'figma', 'other']),
    url: z.string(),
    title: z.string().optional(),
  })).optional(),
  createdAt: z.string(),
  order: z.number(),
});

// Swimlane schema
const swimlaneSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: z.string(),
  icon: z.string().optional(),
  order: z.number(),
  isCustom: z.boolean().optional(),
  collapsed: z.boolean().optional(),
});

const updateRoadmapSchema = z.object({
  title: z.string().min(1).optional(),
  objective: z.string().optional(),
  vision: z.string().optional(),
  planningHorizon: z.string().optional(),
  swimlanes: z.array(swimlaneSchema).optional(),
  items: z.array(roadmapItemSchema).optional(),
  backlog: z.array(backlogItemSchema).optional(),
  tags: z.array(tagSchema).optional(),
  successMetrics: z.object({
    quantitative: z.array(z.string()),
    qualitative: z.array(z.string()),
  }).optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "active", "review", "archived"]).optional(),
  conversationId: z.string().uuid().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const roadmap = await getRoadmap(params.id, user.id);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Failed to fetch roadmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateRoadmapSchema.parse(body);

    const roadmap = await updateRoadmap(params.id, user.id, data);

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    // Sync to RAG in background (non-blocking)
    pushRoadmapToRAG(params.id, user.id).catch((err) => {
      console.error("[Roadmap] Background RAG sync failed:", err);
    });

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Failed to update roadmap:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update roadmap" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    // Delete RAG source first
    await deleteMethodSource(params.id, user.id, "roadmap");

    await deleteRoadmap(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete roadmap:", error);
    return NextResponse.json(
      { error: "Failed to delete roadmap" },
      { status: 500 }
    );
  }
}
