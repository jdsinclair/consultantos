CREATE TABLE IF NOT EXISTS "clarity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
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
	"field_meta" jsonb,
	"conversation_id" uuid,
	"last_updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clarity_documents_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clarity_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"field_name" text NOT NULL,
	"custom_field_title" text,
	"suggested_value" text NOT NULL,
	"action" text DEFAULT 'update',
	"reasoning" text,
	"confidence" real,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"source_context" text,
	"status" text DEFAULT 'pending',
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clarity_method_canvases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"strategic_truth" jsonb,
	"north_star" jsonb,
	"core_engine" jsonb,
	"value_expansion" jsonb,
	"service_product_filter" jsonb,
	"kill_list" jsonb,
	"paranoia_map" jsonb,
	"strategy" jsonb,
	"swimlanes" jsonb,
	"phase" text DEFAULT 'diagnostic',
	"locked_sections" jsonb,
	"history" jsonb,
	"conversation_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clarity_method_canvases_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_portals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"name" text,
	"welcome_message" text,
	"brand_color" text,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_portals_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "client_portals_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "execution_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"objective" text,
	"timeframe" text,
	"start_date" timestamp,
	"target_date" timestamp,
	"goal" text,
	"success_metrics" jsonb,
	"sections" jsonb,
	"notes" text,
	"rules" jsonb,
	"source_swimlane_key" text,
	"source_timeframe" text,
	"source_clarity_canvas_id" uuid,
	"conversation_id" uuid,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" uuid NOT NULL,
	"shared_item_id" uuid,
	"access_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"objective" text,
	"vision" text,
	"planning_horizon" text,
	"swimlanes" jsonb,
	"items" jsonb,
	"backlog" jsonb,
	"success_metrics" jsonb,
	"notes" text,
	"conversation_id" uuid,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid NOT NULL,
	"display_name" text,
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"deep_link_token" text,
	"view_count" integer DEFAULT 0,
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_items_deep_link_token_unique" UNIQUE("deep_link_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"start_char" integer,
	"end_char" integer,
	"metadata" jsonb,
	"embedding" vector(1536),
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_items" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'prospect';--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "note_id" uuid;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "email_id" uuid;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "action_items" ADD COLUMN "source_context" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "phone_country_code" text DEFAULT '+1';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deal_value" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deal_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "deal_notes" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "evaluation" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "evaluated_at" timestamp;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "source_notes" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "note_type" text DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "labels" jsonb;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "added_to_sources" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_historic" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_date" timestamp;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "ai_summary" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_documents" ADD CONSTRAINT "clarity_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_documents" ADD CONSTRAINT "clarity_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_insights" ADD CONSTRAINT "clarity_insights_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_insights" ADD CONSTRAINT "clarity_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_method_canvases" ADD CONSTRAINT "clarity_method_canvases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarity_method_canvases" ADD CONSTRAINT "clarity_method_canvases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portals" ADD CONSTRAINT "client_portals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_portals" ADD CONSTRAINT "client_portals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_source_clarity_canvas_id_clarity_method_canvases_id_fk" FOREIGN KEY ("source_clarity_canvas_id") REFERENCES "public"."clarity_method_canvases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_portal_id_client_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."client_portals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_shared_item_id_shared_items_id_fk" FOREIGN KEY ("shared_item_id") REFERENCES "public"."shared_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_items" ADD CONSTRAINT "shared_items_portal_id_client_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."client_portals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_items" ADD CONSTRAINT "shared_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_docs_client_idx" ON "clarity_documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_docs_user_idx" ON "clarity_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_insights_client_idx" ON "clarity_insights" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_insights_status_idx" ON "clarity_insights" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_canvas_client_idx" ON "clarity_method_canvases" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarity_canvas_user_idx" ON "clarity_method_canvases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_portals_client_idx" ON "client_portals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_portals_token_idx" ON "client_portals" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_plans_client_idx" ON "execution_plans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_plans_user_idx" ON "execution_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_plans_status_idx" ON "execution_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_access_logs_portal_idx" ON "portal_access_logs" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmaps_client_idx" ON "roadmaps" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmaps_user_idx" ON "roadmaps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roadmaps_status_idx" ON "roadmaps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_items_portal_idx" ON "shared_items" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_items_item_idx" ON "shared_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_items_deep_link_idx" ON "shared_items" USING btree ("deep_link_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_chunks_source_idx" ON "source_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_chunks_client_idx" ON "source_chunks" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_chunks_user_idx" ON "source_chunks" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_items" ADD CONSTRAINT "action_items_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_items" ADD CONSTRAINT "action_items_email_id_inbound_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."inbound_emails"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_items_parent_idx" ON "action_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients" USING btree ("status");