import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { db } from "@/db";
import { sourceChunks, sources } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { NewSourceChunk } from "@/db/schema";

// Embedding model configuration
const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  });
  return embeddings;
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
 */
export async function processSourceEmbeddings(
  sourceId: string,
  clientId: string,
  userId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Delete existing chunks for this source
  await db.delete(sourceChunks).where(eq(sourceChunks.sourceId, sourceId));

  // Chunk the content
  const chunks = chunkContent(content);

  if (chunks.length === 0) return;

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
        clientId,
        userId,
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
}

/**
 * Search for relevant chunks using vector similarity
 * Returns chunks sorted by relevance with their source info
 */
export async function searchRelevantChunks(
  query: string,
  clientId: string,
  userId: string,
  limit = 10,
  minSimilarity = 0.7
): Promise<Array<{
  content: string;
  sourceName: string;
  sourceType: string;
  sourceId: string;
  similarity: number;
  metadata: unknown;
}>> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Search using cosine similarity
  // Note: This uses raw SQL for pgvector operations
  const results = await db.execute(sql`
    SELECT
      sc.content,
      sc.metadata,
      sc.source_id,
      s.name as source_name,
      s.type as source_type,
      1 - (sc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM source_chunks sc
    JOIN sources s ON s.id = sc.source_id
    WHERE sc.client_id = ${clientId}
      AND sc.user_id = ${userId}
      AND sc.embedding IS NOT NULL
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
  }>).map(row => ({
    content: row.content,
    sourceName: row.source_name,
    sourceType: row.source_type,
    sourceId: row.source_id,
    similarity: row.similarity,
    metadata: row.metadata,
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
