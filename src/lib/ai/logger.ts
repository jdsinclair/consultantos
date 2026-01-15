/**
 * AI Call Logger - tracks all AI API calls for debugging
 * Persists logs to a JSON Lines file for full visibility into prompts/responses
 */

import { promises as fs } from "fs";
import path from "path";

export interface AILogEntry {
  id: string;
  timestamp: string;
  operation: string; // e.g., 'vision', 'summary', 'insights', 'embeddings', 'chat'
  model: string;
  status: "pending" | "success" | "error";
  duration?: number; // milliseconds
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  // Full prompt/response for debugging
  prompt?: string;
  systemPrompt?: string;
  response?: string;
}

// Log file path - stored in project root logs folder
const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "aiu-calls.jsonl");

// Max age for auto-cleanup (7 days)
const MAX_LOG_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache for pending logs (before they're written)
const pendingLogs = new Map<string, AILogEntry>();

/**
 * Ensure log directory exists
 */
async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch {
    // Directory likely exists
  }
}

/**
 * Append a log entry to the file
 */
async function appendToFile(entry: AILogEntry): Promise<void> {
  try {
    await ensureLogDir();
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(LOG_FILE, line, "utf-8");
    console.log(`[AI Logger] Written to file: ${entry.operation} (${entry.status})`);
  } catch (err) {
    console.error("[AI Logger] FAILED to write to file:", err);
    console.error("[AI Logger] Log dir:", LOG_DIR);
    console.error("[AI Logger] Log file:", LOG_FILE);
    console.error("[AI Logger] Entry:", JSON.stringify(entry).slice(0, 200));
  }
}

/**
 * Create a new AI call log entry
 */
export function logAICall(
  entry: Omit<AILogEntry, "id" | "timestamp">,
  options?: { prompt?: string; systemPrompt?: string }
): string {
  const id = crypto.randomUUID();
  const logEntry: AILogEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
    prompt: options?.prompt,
    systemPrompt: options?.systemPrompt,
  };

  // Store in memory for pending status
  pendingLogs.set(id, logEntry);

  // Console log for server visibility
  const statusEmoji =
    entry.status === "success" ? "✓" : entry.status === "error" ? "✗" : "⋯";
  console.log(
    `[AI ${statusEmoji}] ${entry.operation} (${entry.model}) ${entry.duration ? `${entry.duration}ms` : ""}`
  );
  if (entry.error) {
    console.error(`[AI Error] ${entry.error}`);
  }

  return id;
}

/**
 * Update an existing log entry and persist to file
 */
export async function updateAILog(
  id: string,
  update: Partial<AILogEntry>
): Promise<void> {
  const entry = pendingLogs.get(id);
  if (entry) {
    const updatedEntry = { ...entry, ...update };
    pendingLogs.delete(id);

    // Write completed entry to file
    try {
      await appendToFile(updatedEntry);
    } catch (err) {
      console.error("[AI Logger] Failed to write log:", err);
    }

    // Console log completion
    if (update.status === "success" || update.status === "error") {
      const statusEmoji = update.status === "success" ? "✓" : "✗";
      console.log(
        `[AI ${statusEmoji}] ${updatedEntry.operation} completed in ${updatedEntry.duration}ms`
      );
    }
  }
}

/**
 * Get AI logs from file (with pagination)
 */
export async function getAILogs(
  limit: number = 50,
  offset: number = 0
): Promise<AILogEntry[]> {
  await ensureLogDir();

  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Parse and sort by timestamp (newest first)
    const logs: AILogEntry[] = lines
      .map((line) => {
        try {
          return JSON.parse(line) as AILogEntry;
        } catch {
          return null;
        }
      })
      .filter((log): log is AILogEntry => log !== null)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    // Apply pagination
    return logs.slice(offset, offset + limit);
  } catch {
    // File doesn't exist yet
    return [];
  }
}

/**
 * Get total log count
 */
export async function getAILogCount(): Promise<number> {
  await ensureLogDir();

  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    return content.trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Clear all AI logs
 */
export async function clearAILogs(): Promise<void> {
  await ensureLogDir();
  try {
    await fs.writeFile(LOG_FILE, "", "utf-8");
  } catch {
    // File doesn't exist
  }
}

/**
 * Clean up old logs (older than MAX_LOG_AGE_MS)
 */
export async function cleanupOldLogs(): Promise<number> {
  await ensureLogDir();

  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const cutoff = Date.now() - MAX_LOG_AGE_MS;
    const filteredLines: string[] = [];
    let removedCount = 0;

    for (const line of lines) {
      try {
        const log = JSON.parse(line) as AILogEntry;
        if (new Date(log.timestamp).getTime() >= cutoff) {
          filteredLines.push(line);
        } else {
          removedCount++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (removedCount > 0) {
      await fs.writeFile(LOG_FILE, filteredLines.join("\n") + "\n", "utf-8");
    }

    return removedCount;
  } catch {
    return 0;
  }
}

/**
 * Helper to wrap an AI call with full logging
 */
export async function withAILogging<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
  options?: { prompt?: string; systemPrompt?: string }
): Promise<T> {
  const startTime = Date.now();
  const logId = logAICall(
    {
      operation,
      model,
      status: "pending",
      metadata,
    },
    options
  );

  try {
    const result = await fn();

    // Extract response text if possible
    let responseText: string | undefined;
    if (typeof result === "string") {
      responseText = result;
    } else if (
      result &&
      typeof result === "object" &&
      "text" in result &&
      typeof (result as Record<string, unknown>).text === "string"
    ) {
      responseText = (result as Record<string, unknown>).text as string;
    }

    await updateAILog(logId, {
      status: "success",
      duration: Date.now() - startTime,
      response: responseText,
    });
    return result;
  } catch (error) {
    await updateAILog(logId, {
      status: "error",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Log a completed AI call directly (for streaming/special cases)
 */
export async function logCompletedAICall(
  entry: Omit<AILogEntry, "id" | "timestamp">
): Promise<void> {
  const logEntry: AILogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  try {
    await appendToFile(logEntry);
  } catch (err) {
    console.error("[AI Logger] Failed to write log:", err);
  }

  // Console log
  const statusEmoji =
    entry.status === "success" ? "✓" : entry.status === "error" ? "✗" : "⋯";
  console.log(
    `[AI ${statusEmoji}] ${entry.operation} (${entry.model}) ${entry.duration ? `${entry.duration}ms` : ""}`
  );
  if (entry.error) {
    console.error(`[AI Error] ${entry.error}`);
  }
}
