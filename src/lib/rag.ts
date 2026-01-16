import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { db } from "@/db";
import { sourceChunks, sources } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { NewSourceChunk } from "@/db/schema";
import { logAICall, updateAILog } from "./ai/logger";

// Embedding model configuration
const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error("[RAG] Failed to generate embedding:", error);
    console.error("[RAG] Text length:", text.length);
    console.error("[RAG] OpenAI API key configured:", !!process.env.OPENAI_API_KEY);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    console.log(`[RAG] Generating embeddings for ${texts.length} chunks...`);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: texts,
    });
    console.log(`[RAG] Successfully generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error("[RAG] Failed to generate batch embeddings:", error);
    console.error("[RAG] Number of texts:", texts.length);
    console.error("[RAG] Total characters:", texts.reduce((sum, t) => sum + t.length, 0));
    console.error("[RAG] OpenAI API key configured:", !!process.env.OPENAI_API_KEY);
    throw error;
  }
}

/**
 * Split content into overlapping chunks with metadata
 */
export function chunkContent(
  content: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): Array<{ content: string; startChar: number; endChar: number }> {
  const chunks: Array<{ content: string; startChar: number; endChar: number }> = [];

  // Clean the content
  const cleanedContent = content.replace(/\s+/g, ' ').trim();

  if (cleanedContent.length <= chunkSize) {
    return [{
      content: cleanedContent,
      startChar: 0,
      endChar: cleanedContent.length,
    }];
  }

  let start = 0;
  while (start < cleanedContent.length) {
    const end = Math.min(start + chunkSize, cleanedContent.length);

    // Try to break at sentence or word boundary
    let actualEnd = end;
    if (end < cleanedContent.length) {
      // Look for sentence boundary
      const lastPeriod = cleanedContent.lastIndexOf('. ', end);
      const lastNewline = cleanedContent.lastIndexOf('\n', end);
      const boundary = Math.max(lastPeriod, lastNewline);

      if (boundary > start + chunkSize * 0.5) {
        actualEnd = boundary + 1;
      } else {
        // Fall back to word boundary
        const lastSpace = cleanedContent.lastIndexOf(' ', end);
        if (lastSpace > start) {
          actualEnd = lastSpace;
        }
      }
    }

    chunks.push({
      content: cleanedContent.slice(start, actualEnd).trim(),
      startChar: start,
      endChar: actualEnd,
    });

    start = actualEnd - overlap;
    if (start < 0) start = 0;
    if (actualEnd >= cleanedContent.length) break;
  }

  return chunks;
}

/**
 * Process and embed a source's content, storing chunks in database
 * @param sourceId - The source ID
 * @param clientId - The client ID (null for personal sources)
 * @param userId - The user ID
 * @param isPersonal - Whether this is a personal/user-level source
 * @param contentOverride - Optional content override (otherwise fetches from source)
 * @param metadata - Optional metadata for chunks
 */
export async function processSourceEmbeddings(
  sourceId: string,
  clientId: string | null,
  userId: string,
  isPersonal: boolean = false,
  contentOverride?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.log(`[Embeddings] Starting embedding process for source ${sourceId} (personal: ${isPersonal})`);

  // Get content from source if not overridden
  let content = contentOverride;
  if (!content) {
    const source = await db.query.sources.findFirst({
      where: eq(sources.id, sourceId),
    });
    content = source?.content || '';
  }

  console.log(`[Embeddings] Content length: ${content.length} characters`);

  const startTime = Date.now();
  const logId = logAICall({
    operation: "embeddings",
    model: "text-embedding-3-small",
    status: "pending",
    metadata: { sourceId, contentLength: content.length, isPersonal },
  });

  try {
    // Delete existing chunks for this source
    console.log(`[Embeddings] Deleting existing chunks for source ${sourceId}`);
    await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, sourceId));

    // Chunk the content
    const chunks = chunkContent(content);
    console.log(`[Embeddings] Created ${chunks.length} chunks from content`);

    if (chunks.length === 0) {
      await updateAILog(logId, {
        status: "success",
        duration: Date.now() - startTime,
        metadata: { sourceId, contentLength: content.length, chunks: 0, isPersonal },
      });
      return;
    }

    // Generate embeddings in batches (OpenAI has limits)
    const BATCH_SIZE = 100;
    const allChunkData: NewSourceChunk[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.content);

      // Generate embeddings for batch
      const embeddings = await generateEmbeddings(texts);

      // Create chunk records
      for (let j = 0; j < batch.length; j++) {
        allChunkData.push({
          sourceId,
          clientId, // Can be null for personal sources
          userId,
          isPersonal,
          content: batch[j].content,
          chunkIndex: i + j,
          startChar: batch[j].startChar,
          endChar: batch[j].endChar,
          embedding: embeddings[j],
          metadata: metadata || null,
        });
      }
    }

    // Insert all chunks
    if (allChunkData.length > 0) {
      await db.insert(sourceChunks).values(allChunkData);
    }

    await updateAILog(logId, {
      status: "success",
      duration: Date.now() - startTime,
      metadata: { sourceId, contentLength: content.length, chunks: allChunkData.length, isPersonal },
    });

    console.log(`[Embeddings] Generated ${allChunkData.length} chunks for source ${sourceId}`);
  } catch (error) {
    console.error(`[Embeddings] FAILED for source ${sourceId}:`, error);
    console.error(`[Embeddings] Error type:`, error instanceof Error ? error.name : typeof error);
    console.error(`[Embeddings] Error message:`, error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(`[Embeddings] Stack:`, error.stack);
    }
    await updateAILog(logId, {
      status: "error",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Search for relevant chunks using vector similarity
 * Returns chunks sorted by relevance with their source info
 * @param includePersonal - If true, also includes user's personal knowledge sources
 */
export async function searchRelevantChunks(
  query: string,
  clientId: string,
  userId: string,
  limit = 10,
  minSimilarity = 0.7,
  includePersonal = false
): Promise<Array<{
  content: string;
  sourceName: string;
  sourceType: string;
  sourceId: string;
  similarity: number;
  metadata: unknown;
  isPersonal?: boolean;
}>> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Search using cosine similarity
  // Note: This uses raw SQL for pgvector operations
  // Excludes sources marked with exclude_from_rag = true
  // Optionally includes personal sources
  const personalCondition = includePersonal
    ? sql`(sc.client_id = ${clientId} OR (sc.is_personal = true AND sc.user_id = ${userId}))`
    : sql`sc.client_id = ${clientId}`;

  const results = await db.execute(sql`
    SELECT
      sc.content,
      sc.metadata,
      sc.source_id,
      sc.is_personal,
      s.name as source_name,
      s.type as source_type,
      1 - (sc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM source_chunks sc
    JOIN sources s ON s.id = sc.source_id
    WHERE ${personalCondition}
      AND sc.user_id = ${userId}
      AND sc.embedding IS NOT NULL
      AND (s.exclude_from_rag IS NULL OR s.exclude_from_rag = false)
      AND 1 - (sc.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY sc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows as Array<{
    content: string;
    source_name: string;
    source_type: string;
    source_id: string;
    similarity: number;
    metadata: unknown;
    is_personal: boolean;
  }>).map(row => ({
    content: row.content,
    sourceName: row.source_name,
    sourceType: row.source_type,
    sourceId: row.source_id,
    similarity: row.similarity,
    metadata: row.metadata,
    isPersonal: row.is_personal,
  }));
}

/**
 * Search for relevant personal knowledge chunks only
 * For queries that should draw from user's own expertise/methodology
 */
export async function searchPersonalKnowledge(
  query: string,
  userId: string,
  limit = 5,
  minSimilarity = 0.6
): Promise<Array<{
  content: string;
  sourceName: string;
  sourceType: string;
  sourceId: string;
  similarity: number;
  personalCategory: string | null;
}>> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await db.execute(sql`
    SELECT
      sc.content,
      sc.source_id,
      s.name as source_name,
      s.type as source_type,
      s.personal_category,
      1 - (sc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM source_chunks sc
    JOIN sources s ON s.id = sc.source_id
    WHERE sc.user_id = ${userId}
      AND sc.is_personal = true
      AND sc.embedding IS NOT NULL
      AND (s.exclude_from_rag IS NULL OR s.exclude_from_rag = false)
      AND 1 - (sc.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY sc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows as Array<{
    content: string;
    source_id: string;
    source_name: string;
    source_type: string;
    personal_category: string | null;
    similarity: number;
  }>).map(row => ({
    content: row.content,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceType: row.source_type,
    personalCategory: row.personal_category,
    similarity: row.similarity,
  }));
}

/**
 * Get all chunks for a specific source
 */
export async function getSourceChunks(sourceId: string, userId: string) {
  return db.query.sourceChunks.findMany({
    where: and(
      eq(sourceChunks.sourceId, sourceId),
      eq(sourceChunks.userId, userId)
    ),
    orderBy: [sourceChunks.chunkIndex],
  });
}

/**
 * Build context string from relevant chunks for AI
 */
export function buildContextFromChunks(
  chunks: Array<{
    content: string;
    sourceName: string;
    sourceType: string;
    similarity: number;
  }>
): string {
  if (chunks.length === 0) return '';

  const contextParts = chunks.map((chunk, i) => {
    return `[Source: ${chunk.sourceName} (${chunk.sourceType})]
${chunk.content}`;
  });

  return `## Relevant Context from Sources

${contextParts.join('\n\n---\n\n')}`;
}

/**
 * Search for similar chunks - more flexible version for debug
 * Can search across all clients or a specific client
 */
export async function searchSimilarChunks(
  query: string,
  userId: string,
  options?: {
    clientId?: string;
    limit?: number;
    minSimilarity?: number;
  }
): Promise<Array<{
  content: string;
  sourceId: string;
  chunkIndex: number;
  similarity: number;
  source?: { name: string; type: string };
}>> {
  const limit = options?.limit || 10;
  const minSimilarity = options?.minSimilarity || 0.5;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build query with optional client filter
  const clientCondition = options?.clientId
    ? sql`AND sc.client_id = ${options.clientId}`
    : sql``;

  // Search using cosine similarity
  // Excludes sources marked with exclude_from_rag = true
  const results = await db.execute(sql`
    SELECT
      sc.content,
      sc.source_id,
      sc.chunk_index,
      s.name as source_name,
      s.type as source_type,
      1 - (sc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM source_chunks sc
    JOIN sources s ON s.id = sc.source_id
    WHERE sc.user_id = ${userId}
      ${clientCondition}
      AND sc.embedding IS NOT NULL
      AND (s.exclude_from_rag IS NULL OR s.exclude_from_rag = false)
      AND 1 - (sc.embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
    ORDER BY sc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows as Array<{
    content: string;
    source_id: string;
    chunk_index: number;
    source_name: string;
    source_type: string;
    similarity: number;
  }>).map(row => ({
    content: row.content,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    source: {
      name: row.source_name,
      type: row.source_type,
    },
  }));
}
