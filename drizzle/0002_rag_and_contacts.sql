-- Migration: Add RAG (vector embeddings) and contact fields
-- Run this in Neon SQL Editor after previous migrations

-- Enable pgvector extension (run this first!)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add contact fields to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone_country_code" text DEFAULT '+1';

-- Create source_chunks table for RAG
CREATE TABLE IF NOT EXISTS "source_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "sources"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "content" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "start_char" integer,
  "end_char" integer,
  "metadata" jsonb,
  "embedding" vector(1536),
  "summary" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for source_chunks
CREATE INDEX IF NOT EXISTS "source_chunks_source_idx" ON "source_chunks" USING btree ("source_id");
CREATE INDEX IF NOT EXISTS "source_chunks_client_idx" ON "source_chunks" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "source_chunks_user_idx" ON "source_chunks" USING btree ("user_id");

-- Create vector similarity index for fast semantic search
-- Using IVFFlat for good balance of speed and accuracy
-- Adjust 'lists' parameter based on data size (sqrt of row count is a good starting point)
CREATE INDEX IF NOT EXISTS "source_chunks_embedding_idx"
ON "source_chunks"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
