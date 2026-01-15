import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAILogs, getAILogCount, clearAILogs, cleanupOldLogs } from "@/lib/ai/logger";
import { promises as fs } from "fs";
import path from "path";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// Debug info about log file location
const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "aiu-calls.jsonl");

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Debug: Check if log file exists and its contents
    let debugInfo: Record<string, unknown> = {
      logDir: LOG_DIR,
      logFile: LOG_FILE,
      cwd: process.cwd(),
    };

    try {
      const stats = await fs.stat(LOG_FILE);
      debugInfo.fileExists = true;
      debugInfo.fileSize = stats.size;
      debugInfo.fileMtime = stats.mtime;

      // Read raw content for debugging
      const rawContent = await fs.readFile(LOG_FILE, "utf-8");
      debugInfo.rawLines = rawContent.split("\n").filter(Boolean).length;
      debugInfo.rawContentPreview = rawContent.slice(0, 500);
    } catch (err) {
      debugInfo.fileExists = false;
      debugInfo.fileError = err instanceof Error ? err.message : String(err);
    }

    const [logs, totalCount] = await Promise.all([
      getAILogs(limit, offset),
      getAILogCount(),
    ]);

    console.log("[AI Logs API] Returning logs:", { count: logs.length, total: totalCount, debug: debugInfo });

    return NextResponse.json({
      logs,
      total: totalCount,
      limit,
      offset,
      debug: debugInfo, // Include debug info in response
    });
  } catch (error) {
    console.error("Failed to get AI logs:", error);
    return NextResponse.json({ error: "Failed to get AI logs", details: String(error) }, { status: 500 });
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
