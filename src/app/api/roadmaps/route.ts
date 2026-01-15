import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import {
  getRoadmaps,
  createRoadmap,
  createDefaultSwimlanes,
} from "@/lib/db/roadmaps";

export const dynamic = "force-dynamic";

const createRoadmapSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  objective: z.string().optional(),
  vision: z.string().optional(),
  planningHorizon: z.string().optional(),
  swimlanes: z.array(z.object({
    key: z.string(),
    label: z.string(),
    color: z.string(),
    icon: z.string().optional(),
    order: z.number(),
    isCustom: z.boolean().optional(),
    collapsed: z.boolean().optional(),
  })).optional(),
  items: z.array(z.any()).optional(),
  backlog: z.array(z.any()).optional(),
  successMetrics: z.object({
    quantitative: z.array(z.string()).default([]),
    qualitative: z.array(z.string()).default([]),
  }).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;

    const roadmaps = await getRoadmaps(user.id, clientId);
    return NextResponse.json(roadmaps);
  } catch (error) {
    console.error("Failed to fetch roadmaps:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmaps" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createRoadmapSchema.parse(body);

    const roadmap = await createRoadmap({
      ...data,
      userId: user.id,
      swimlanes: data.swimlanes || createDefaultSwimlanes(),
      items: data.items || [],
      backlog: data.backlog || [],
      successMetrics: data.successMetrics || {
        quantitative: [],
        qualitative: [],
      },
      status: "draft",
    });

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Failed to create roadmap:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create roadmap" },
      { status: 500 }
    );
  }
}
