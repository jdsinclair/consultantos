-- Migration: Add prospects support and clarity documents
-- Run this in Neon SQL Editor after 0000_superb_changeling.sql

-- Add new columns to clients for prospect evaluation
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "evaluation" jsonb;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "evaluated_at" timestamp;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "source_type" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "source_notes" text;

-- Update default status from 'active' to 'prospect' for new clients
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'prospect';

-- Add index on clients status for filtering prospects
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients" USING btree ("status");

-- Create clarity_documents table
CREATE TABLE IF NOT EXISTS "clarity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL UNIQUE,
	"user_id" text NOT NULL,
	"niche" text,
	"desired_outcome" text,
	"offer" text,
	"positioning_statement" text,
	"who_we_are" text,
	"what_we_do" text,
	"how_we_do_it" text,
	"our_wedge" text,
	"why_people_love_us" text,
	"how_we_will_die" text,
	"sections" jsonb,
	"conversation_id" uuid,
	"last_updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys for clarity_documents
DO $$ BEGIN
 ALTER TABLE "clarity_documents" ADD CONSTRAINT "clarity_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "clarity_documents" ADD CONSTRAINT "clarity_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for clarity_documents
CREATE INDEX IF NOT EXISTS "clarity_docs_client_idx" ON "clarity_documents" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "clarity_docs_user_idx" ON "clarity_documents" USING btree ("user_id");
