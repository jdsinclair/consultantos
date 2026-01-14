import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAILogs, clearAILogs } from "@/lib/ai/logger";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const logs = getAILogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to get AI logs:", error);
    return NextResponse.json({ error: "Failed to get AI logs" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
    clearAILogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear AI logs:", error);
    return NextResponse.json({ error: "Failed to clear AI logs" }, { status: 500 });
  }
}
