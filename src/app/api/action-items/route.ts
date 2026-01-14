import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/auth";
import {
  getActionItems,
  createActionItem,
  getOverdueActionItems,
} from "@/lib/db/action-items";
import { extractTodosFromText, parseBulkTodos } from "@/lib/ai/extract-todos";
import { z } from "zod";

const createActionItemSchema = z.object({
  clientId: z.string().uuid().optional(), // Optional for quick-add without client
  sessionId: z.string().uuid().optional(),
  noteId: z.string().uuid().optional(),
  emailId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  ownerType: z.enum(["me", "client"]).default("me"),
  dueDate: z.string().optional(), // More flexible date parsing
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  source: z
    .enum(["manual", "detected", "note", "transcript", "email"])
    .default("manual"),
  sourceContext: z.string().optional(),
});

// For bulk text parsing
const bulkParseSchema = z.object({
  text: z.string().min(1),
  clientId: z.string().uuid().optional(),
  useAI: z.boolean().default(true), // Use AI for smart extraction vs simple line split
});

export async function GET(req: NextRequest) {
  try {
    // Debug: Check cookies first
    const cookies = req.cookies.getAll();
    const sessionCookie = cookies.find(c => c.name === '__session');
    
    // Debug: Check auth
    const authObj = await auth();

    if (!authObj.userId) {
      return NextResponse.json({ 
        error: "Unauthorized",
        debug: {
          stage: "auth_check",
          userId: authObj.userId,
          hasCookies: cookies.length,
          hasSessionCookie: !!sessionCookie,
          cookieNames: cookies.map(c => c.name),
        }
      }, { status: 401 });
    }

    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const filter = searchParams.get("filter");
    const limit = searchParams.get("limit");

    if (filter === "overdue") {
      const items = await getOverdueActionItems(user.id);
      return NextResponse.json(items);
    }

    const items = await getActionItems(user.id, {
      clientId: clientId || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(items);
  } catch (error) {
    // Debug: catch any errors
    const cookies = req.cookies.getAll();
    return NextResponse.json({ 
      error: "Unauthorized",
      debug: {
        stage: "catch",
        errorMessage: error instanceof Error ? error.message : String(error),
        hasCookies: cookies.length,
        cookieNames: cookies.map(c => c.name),
      }
    }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    // Handle bulk text parsing
    if (body.action === "bulk-parse") {
      const { text, clientId, useAI } = bulkParseSchema.parse(body);

      let todos: { title: string; priority?: string }[];

      if (useAI) {
        todos = await parseBulkTodos(text);
      } else {
        // Simple line split
        todos = text
          .split(/\n/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((title: string) => ({ title, priority: "medium" }));
      }

      // Create all action items
      const items = await Promise.all(
        todos.map((todo) =>
          createActionItem({
            userId: user.id,
            clientId: clientId || undefined,
            title: todo.title,
            priority: (todo.priority as "low" | "medium" | "high" | "urgent") || "medium",
            source: "manual",
          })
        )
      );

      return NextResponse.json({ items, count: items.length }, { status: 201 });
    }

    // Handle AI extraction from text block
    if (body.action === "extract") {
      const { text, clientId } = bulkParseSchema.parse(body);

      const extracted = await extractTodosFromText(text);

      // Create action items for each extracted TODO
      const items = await Promise.all(
        extracted.map((todo) =>
          createActionItem({
            userId: user.id,
            clientId: clientId || undefined,
            title: todo.title,
            description: todo.description,
            owner: todo.owner,
            ownerType: todo.ownerType,
            priority: todo.priority,
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
            source: "detected",
            sourceContext: todo.sourceContext,
          })
        )
      );

      return NextResponse.json({ items, count: items.length }, { status: 201 });
    }

    // Standard single item creation
    const data = createActionItemSchema.parse(body);

    // Parse due date flexibly
    let dueDate: Date | undefined;
    if (data.dueDate) {
      dueDate = new Date(data.dueDate);
      if (isNaN(dueDate.getTime())) {
        dueDate = undefined;
      }
    }

    const item = await createActionItem({
      ...data,
      userId: user.id,
      dueDate,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create action item:", error);
    return NextResponse.json(
      { error: "Failed to create action item" },
      { status: 500 }
    );
  }
}
