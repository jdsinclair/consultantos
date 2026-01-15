import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAILogs, getAILogCount, clearAILogs, cleanupOldLogs } from "@/lib/ai/logger";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [logs, totalCount] = await Promise.all([
      getAILogs(limit, offset),
      getAILogCount(),
    ]);

    return NextResponse.json({
      logs,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to get AI logs:", error);
    return NextResponse.json({ error: "Failed to get AI logs" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "clear";

    if (action === "cleanup") {
      // Clean up logs older than 7 days
      const removedCount = await cleanupOldLogs();
      return NextResponse.json({ success: true, removedCount });
    } else {
      // Clear all logs
      await clearAILogs();
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Failed to clear AI logs:", error);
    return NextResponse.json({ error: "Failed to clear AI logs" }, { status: 500 });
  }
}
