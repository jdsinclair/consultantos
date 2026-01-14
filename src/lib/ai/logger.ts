/**
 * AI Call Logger - tracks all AI API calls for debugging
 * Stores logs in memory with a max limit (no database required for debugging)
 */

export interface AILogEntry {
  id: string;
  timestamp: string;
  operation: string; // e.g., 'vision', 'summary', 'insights', 'embeddings'
  model: string;
  status: 'pending' | 'success' | 'error';
  duration?: number; // milliseconds
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// In-memory log storage (keeps last 100 entries)
const MAX_LOGS = 100;
const logs: AILogEntry[] = [];

export function logAICall(entry: Omit<AILogEntry, 'id' | 'timestamp'>): string {
  const id = crypto.randomUUID();
  const logEntry: AILogEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(logEntry); // Add to beginning

  // Trim to max size
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }

  // Console log for server visibility
  const statusEmoji = entry.status === 'success' ? '✓' : entry.status === 'error' ? '✗' : '⋯';
  console.log(`[AI ${statusEmoji}] ${entry.operation} (${entry.model}) ${entry.duration ? `${entry.duration}ms` : ''}`);
  if (entry.error) {
    console.error(`[AI Error] ${entry.error}`);
  }

  return id;
}

export function updateAILog(id: string, update: Partial<AILogEntry>): void {
  const index = logs.findIndex(l => l.id === id);
  if (index !== -1) {
    logs[index] = { ...logs[index], ...update };

    // Console log completion
    if (update.status === 'success' || update.status === 'error') {
      const entry = logs[index];
      const statusEmoji = update.status === 'success' ? '✓' : '✗';
      console.log(`[AI ${statusEmoji}] ${entry.operation} completed in ${entry.duration}ms`);
    }
  }
}

export function getAILogs(limit: number = 50): AILogEntry[] {
  return logs.slice(0, limit);
}

export function clearAILogs(): void {
  logs.length = 0;
}

/**
 * Helper to wrap an AI call with logging
 */
export async function withAILogging<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  const logId = logAICall({
    operation,
    model,
    status: 'pending',
    metadata,
  });

  try {
    const result = await fn();
    updateAILog(logId, {
      status: 'success',
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    updateAILog(logId, {
      status: 'error',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
