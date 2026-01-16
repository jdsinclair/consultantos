import { pgTable, text, timestamp, jsonb, uuid, integer, boolean, index, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// Custom vector type for pgvector
const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`; // OpenAI text-embedding-3-small is 1536 dims
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.slice(1, -1).split(',').map(Number);
    }
    return value as number[];
  },
});

// Users - synced from Clerk, stores user preferences and consultant profile
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  name: text('name'),
  imageUrl: text('image_url'),
  // Consultant profile
  nickname: text('nickname'), // How they want AI to refer to them
  businessName: text('business_name'), // Consulting business name
  website: text('website'),
  phone: text('phone'),
  timezone: text('timezone'),
  bio: text('bio'), // About the consultant - used for AI context
  specialties: jsonb('specialties').$type<string[]>(), // Areas of expertise
  // AI Profile - rich context for AI personalization
  linkedin: text('linkedin'), // LinkedIn profile URL
  otherWebsites: jsonb('other_websites').$type<string[]>(), // Twitter/X, YouTube, podcast, etc.
  personalStory: text('personal_story'), // Their journey, background, why they consult
  methodology: text('methodology'), // Their consulting approach, frameworks, beliefs
  notableClients: text('notable_clients'), // Past clients, case studies (anonymized if needed)
  contentAssets: text('content_assets'), // Newsletters, books, courses, frameworks they've created
  uniquePerspective: text('unique_perspective'), // What makes their POV different
  communicationStyle: text('communication_style'), // How they communicate (direct, nurturing, data-driven, etc.)
  aiContextSummary: text('ai_context_summary'), // AI-generated summary from Help Me wizard
  aiProfile: jsonb('ai_profile').$type<AIProfile>(), // Structured AI profile data
  // Onboarding
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(0),
  // Settings
  preferences: jsonb('preferences'), // user settings, default persona, etc.
  // Email ingestion
  ingestEmail: text('ingest_email'), // unique email for forwarding emails into system
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Profile structure for deep personalization
export interface AIProfile {
  // Core identity
  consultantType?: string; // strategy, growth, product, etc.
  targetClients?: string; // Who they typically work with
  typicalEngagement?: string; // How engagements usually work
  // Expertise
  primaryExpertise?: string[];
  industryFocus?: string[];
  // Voice & style
  tonePreferences?: string[]; // direct, warm, analytical, etc.
  avoidPhrases?: string[]; // Things they never say
  signaturePhrases?: string[]; // Things they often say
  // Knowledge sources
  knowledgeSources?: {
    id: string;
    type: 'newsletter' | 'book' | 'course' | 'framework' | 'podcast' | 'other';
    name: string;
    description?: string;
    url?: string;
  }[];
  // Meta
  lastUpdated?: string;
  buildVersion?: number; // Incremented each time Help Me wizard runs
}

// Clients - each consulting engagement (belongs to a user)
// Status can be: 'prospect', 'active', 'paused', 'completed', 'prospect_lost', 'client_cancelled'
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  // Contact info (primary contact for this client/prospect)
  firstName: text('first_name'),
  lastName: text('last_name'),
  name: text('name').notNull(), // Display name (can be computed or manual)
  email: text('email'),
  phone: text('phone'),
  phoneCountryCode: text('phone_country_code').default('+1'),
  // Company info
  company: text('company'),
  industry: text('industry'),
  website: text('website'),
  description: text('description'),
  status: text('status').default('prospect'), // prospect, active, paused, completed, prospect_lost, client_cancelled
  color: text('color'), // for UI display
  // Deal/Financial info (hidden by default with $ toggle)
  dealValue: integer('deal_value'), // in cents (e.g., 500000 = $5,000)
  dealStatus: text('deal_status').default('none'), // none, placeholder, presented, active
  dealNotes: text('deal_notes'), // private notes about the deal
  // Prospect evaluation
  evaluation: jsonb('evaluation').$type<ProspectEvaluation>(), // AI evaluation of the prospect
  evaluatedAt: timestamp('evaluated_at'),
  // Source info (how they came to us)
  sourceType: text('source_type'), // email, referral, inbound, outreach, webhook
  sourceNotes: text('source_notes'),
  // Tracking
  viewedAt: timestamp('viewed_at'), // null = "new" badge, set on first view
  metadata: jsonb('metadata'), // flexible storage for client-specific data
  // "At Some Point" - dumping ground for future ideas/thoughts
  atSomePoint: jsonb('at_some_point').$type<AtSomePointItem[]>(),
  // "Links" - reference links (competitors, people, resources)
  links: jsonb('links').$type<ClientLink[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('clients_user_idx').on(table.userId),
  statusIdx: index('clients_status_idx').on(table.status),
}));

// Type definitions for new client fields
export interface AtSomePointItem {
  id: string;
  title: string;
  text?: string;
  createdAt: string;
}

export interface ClientLink {
  id: string;
  title: string;
  url: string;
  type?: 'competitor' | 'person' | 'resource' | 'reference' | 'other';
  notes?: string;
  createdAt: string;
}

// Clarity Documents - the evolving business definition for each client
export const clarityDocuments = pgTable('clarity_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: text('user_id').references(() => users.id).notNull(),
  // Core positioning
  niche: text('niche'), // Who they serve
  desiredOutcome: text('desired_outcome'), // What they help achieve
  offer: text('offer'), // How they deliver it
  positioningStatement: text('positioning_statement'), // "We help [NICHE] achieve [OUTCOME] with [OFFER]"
  // Business fundamentals
  whoWeAre: text('who_we_are'),
  whatWeDo: text('what_we_do'),
  howWeDoIt: text('how_we_do_it'),
  ourWedge: text('our_wedge'), // Unique differentiator
  whyPeopleLoveUs: text('why_people_love_us'),
  howWeWillDie: text('how_we_will_die'), // Biggest risks/threats
  // Additional sections
  sections: jsonb('sections').$type<ClaritySection[]>(), // Custom locked-in insights
  // Field metadata (status, source for each field)
  fieldMeta: jsonb('field_meta').$type<Record<string, ClarityFieldMeta>>(),
  // AI conversation history for this doc
  conversationId: uuid('conversation_id'),
  // Status
  lastUpdatedBy: text('last_updated_by'), // 'user' or 'ai'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('clarity_docs_client_idx').on(table.clientId),
  userIdx: index('clarity_docs_user_idx').on(table.userId),
}));

// Clarity Insights - pending AI suggestions for clarity document updates
export const clarityInsights = pgTable('clarity_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  // What field this insight is for (or 'custom' for new fields)
  fieldName: text('field_name').notNull(), // 'niche', 'whatWeDo', 'custom:slogan', etc.
  customFieldTitle: text('custom_field_title'), // For custom fields, the display title
  // The suggested content
  suggestedValue: text('suggested_value').notNull(),
  action: text('action').default('update'), // 'create', 'update', 'append', 'replace'
  // Why this suggestion
  reasoning: text('reasoning'), // AI explanation of why this is relevant
  confidence: real('confidence'), // 0-1 confidence score
  // Source of the insight
  sourceType: text('source_type').notNull(), // 'source', 'session', 'chat', 'email'
  sourceId: uuid('source_id'), // ID of source/session/etc
  sourceContext: text('source_context'), // Relevant excerpt or context
  // Status
  status: text('status').default('pending'), // 'pending', 'accepted', 'rejected', 'deferred'
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('clarity_insights_client_idx').on(table.clientId),
  statusIdx: index('clarity_insights_status_idx').on(table.status),
}));

// Clarity Method Types
export interface ClarityStrategicTruth {
  whoWeAre: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
  whatWeDo: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
  whyWeWin: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
  whatWeAreNot: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
  howWeDie: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
  theWedge: { value: string; status: 'draft' | 'locked'; lockedAt?: string };
}

export interface ClarityNorthStar {
  revenueTarget: string;
  marginFloor: string;
  founderRole: string; // what they stop doing
  complexityCeiling: string;
}

export interface ClarityCoreEngine {
  demand: { answer: string; warning?: string };
  salesScoping: { answer: string; warning?: string };
  delivery: { answer: string; warning?: string };
  qualityControl: { answer: string; warning?: string };
  cashFlow: { answer: string; warning?: string };
  marginByOffer: { answer: string; warning?: string };
  teamLoad: { answer: string; warning?: string };
  primaryConstraint: string; // the ONE constraint
}

export interface ClarityValueExpansion {
  left: { items: ClarityExpansionItem[] };
  core: { items: ClarityExpansionItem[] };
  right: { items: ClarityExpansionItem[] };
  vertical: { items: ClarityExpansionItem[] };
}

export interface ClarityExpansionItem {
  id: string;
  name: string;
  isAttachable: boolean;
  isRepeatable: boolean;
  improvesMargin: boolean;
  status: 'active' | 'parked'; // parked if fails 2 of 3
}

export interface ClarityServiceProduct {
  customService: string[];
  productizedService: string[];
  productIP: string[];
}

export interface ClarityParanoiaMap {
  ai: string;
  inHouse: string;
  priceCompression: string;
  speedCommoditization: string;
  other: string[];
}

export interface ClarityStrategy {
  core: string;
  expansion: string;
  orgShift: string;
  founderRole: string;
  topRisks: string[];
}

export interface ClaritySwimlaneTimeframe {
  objective: string;
  items: string[];
}

export interface ClaritySwimlane {
  short: ClaritySwimlaneTimeframe | string[]; // Support both new and legacy formats
  mid: ClaritySwimlaneTimeframe | string[];
  long: ClaritySwimlaneTimeframe | string[];
}

export interface ClaritySwimlanes {
  web: ClaritySwimlane;
  brandPositioning: ClaritySwimlane;
  gtm: ClaritySwimlane;
  sales: ClaritySwimlane;
  pricingPackaging: ClaritySwimlane;
  offersAssets: ClaritySwimlane;
  deliveryProduction: ClaritySwimlane;
  teamOrg: ClaritySwimlane;
  opsSystems: ClaritySwimlane;
  financeMargin: ClaritySwimlane;
  founderRole: ClaritySwimlane;
  riskDefensibility: ClaritySwimlane;
  ecosystemPartners: ClaritySwimlane;
  legalIP: ClaritySwimlane;
  technology: ClaritySwimlane;
  // Custom swimlanes with dynamic keys
  [key: `custom_${string}`]: ClaritySwimlane & { label: string };
}

export interface ClarityCanvasVersion {
  id: string;
  timestamp: string;
  changedBy: 'user' | 'ai';
  changes: string; // description of what changed
  snapshot?: Partial<{
    strategicTruth: ClarityStrategicTruth;
    northStar: ClarityNorthStar;
    strategy: ClarityStrategy;
  }>;
}

// Clarity Method™ Canvas - Strategic Diagnosis + Execution Mapping
export const clarityMethodCanvases = pgTable('clarity_method_canvases', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: text('user_id').references(() => users.id).notNull(),
  
  // Section 0: Strategic Truth Header (6 boxes)
  strategicTruth: jsonb('strategic_truth').$type<ClarityStrategicTruth>(),
  
  // Section 1: North Star (Constraints, not vision)
  northStar: jsonb('north_star').$type<ClarityNorthStar>(),
  
  // Section 2: Core Engine (Reality diagnosis)
  coreEngine: jsonb('core_engine').$type<ClarityCoreEngine>(),
  
  // Section 3: Value Expansion Map
  valueExpansion: jsonb('value_expansion').$type<ClarityValueExpansion>(),
  
  // Section 4: Service vs Product Filter
  serviceProductFilter: jsonb('service_product_filter').$type<ClarityServiceProduct>(),
  
  // Section 5: Kill List
  killList: jsonb('kill_list').$type<string[]>(),
  
  // Section 6: Paranoia Map
  paranoiaMap: jsonb('paranoia_map').$type<ClarityParanoiaMap>(),
  
  // Section 7: Strategy (1-page synthesis)
  strategy: jsonb('strategy').$type<ClarityStrategy>(),
  
  // Section 8: Execution Swimlanes
  swimlanes: jsonb('swimlanes').$type<ClaritySwimlanes>(),
  
  // Canvas state
  phase: text('phase').default('diagnostic'), // diagnostic, constraint, execution
  lockedSections: jsonb('locked_sections').$type<string[]>(), // locked section IDs
  
  // Version history
  history: jsonb('history').$type<ClarityCanvasVersion[]>(),
  
  // AI conversation for this canvas
  conversationId: uuid('conversation_id'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('clarity_canvas_client_idx').on(table.clientId),
  userIdx: index('clarity_canvas_user_idx').on(table.userId),
}));

// Initiative metrics for section-level tracking
export interface InitiativeMetrics {
  quantitative: string[];
  qualitative: string[];
}

// "Do The Thing" Execution Plans - tactical drill-down from strategy to action
// Sections are now "Initiatives" with full planning metadata
export interface ExecutionPlanSection {
  id: string;
  title: string;
  
  // Initiative-level planning (optional - fill in when it's a real initiative)
  objective?: string;  // What is this initiative trying to achieve?
  goal?: string;       // Definition of done - what success looks like
  successMetrics?: InitiativeMetrics;  // How we measure success
  rules?: string[];    // Constraints/guardrails for this initiative
  
  // Context
  why?: string;        // Why are we doing this? The rationale
  what?: string;       // Success criteria
  notes?: string;      // Extra context, things to remember
  
  // Lifecycle
  status?: 'draft' | 'active' | 'completed' | 'backlog';
  
  items: ExecutionPlanItem[];
  order: number;
  collapsed?: boolean;
}

export interface ExecutionPlanItem {
  id: string;
  text: string;
  done: boolean;
  children?: ExecutionPlanItem[];
  order: number;
  assignee?: string;
  dueDate?: string;
  notes?: string;
  priority?: 'now' | 'next' | 'later';  // Action priority
  blockedBy?: string;  // What's blocking this?
}

export interface ExecutionPlanSuccessMetrics {
  quantitative: string[];
  qualitative: string[];
}

export const executionPlans = pgTable('execution_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  
  // Core
  title: text('title').notNull(), // "GTM Phase One Plan"
  objective: text('objective'), // What we're doing
  
  // Time
  timeframe: text('timeframe'), // "Q1 2026" or "Phase 1" or "90 days"
  startDate: timestamp('start_date'),
  targetDate: timestamp('target_date'),
  
  // Goals
  goal: text('goal'), // What success looks like
  successMetrics: jsonb('success_metrics').$type<ExecutionPlanSuccessMetrics>(),
  
  // The Plan - nested sections with items
  sections: jsonb('sections').$type<ExecutionPlanSection[]>(),
  
  // Extra
  notes: text('notes'),
  rules: jsonb('rules').$type<string[]>(),
  
  // Source - link to Clarity Method
  sourceSwimlanelKey: text('source_swimlane_key'), // e.g., "gtm", "sales", "teamOrg"
  sourceTimeframe: text('source_timeframe'), // e.g., "short", "mid", "long"
  sourceClarityCanvasId: uuid('source_clarity_canvas_id').references(() => clarityMethodCanvases.id),
  
  // AI conversation for this plan
  conversationId: uuid('conversation_id'),
  
  // Status
  status: text('status').default('draft'), // draft, active, completed, archived
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('execution_plans_client_idx').on(table.clientId),
  userIdx: index('execution_plans_user_idx').on(table.userId),
  statusIdx: index('execution_plans_status_idx').on(table.status),
}));

// Sources - documents, websites, repos, local folders linked to a client OR user (personal knowledge base)
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }), // null = personal/user-level source
  userId: text('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'document', 'website', 'repo', 'folder', 'recording', 'local_folder', 'email', 'image'
  name: text('name').notNull(), // AI-generated friendly name
  originalName: text('original_name'), // Original filename as uploaded
  url: text('url'), // for websites, repos
  localPath: text('local_path'), // for local folder sources
  blobUrl: text('blob_url'), // for uploaded files (Vercel Blob)
  content: text('content'), // extracted/scraped text content (can be large)
  contentChunks: jsonb('content_chunks'), // chunked content for RAG
  // AI-generated summary (editable)
  aiSummary: jsonb('ai_summary').$type<SourceAISummary>(), // What it is, why it matters, key insights
  fileType: text('file_type'), // pdf, docx, pptx, md, png, jpg, etc.
  fileSize: integer('file_size'), // in bytes
  metadata: jsonb('metadata'), // pages crawled, last sync, etc.
  processingStatus: text('processing_status').default('pending'), // pending, processing, completed, failed
  processingError: text('processing_error'),
  lastSyncedAt: timestamp('last_synced_at'),
  // RAG control - exclude certain sources from being used in AI context (e.g., competitor decks)
  excludeFromRag: boolean('exclude_from_rag').default(false),
  sourceCategory: text('source_category'), // competitor_info, client_docs, internal, reference, personal_knowledge, methodology, etc.
  excludeReason: text('exclude_reason'), // notes on why excluded from RAG
  // Personal knowledge base flags
  isPersonal: boolean('is_personal').default(false), // true for user-level sources (vs client-specific)
  personalCategory: text('personal_category'), // newsletter, book, framework, course, podcast, methodology, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('sources_client_idx').on(table.clientId),
  userIdx: index('sources_user_idx').on(table.userId),
  personalIdx: index('sources_personal_idx').on(table.isPersonal),
}));

// Source Chunks - chunked content with embeddings for RAG
export const sourceChunks = pgTable('source_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }), // null for personal sources
  userId: text('user_id').references(() => users.id).notNull(),
  isPersonal: boolean('is_personal').default(false), // true for user-level source chunks
  // Chunk content
  content: text('content').notNull(), // The actual chunk text
  chunkIndex: integer('chunk_index').notNull(), // Position in source (0-indexed)
  // Metadata for retrieval
  startChar: integer('start_char'), // Character position in original content
  endChar: integer('end_char'),
  metadata: jsonb('metadata'), // Page number, section title, etc.
  // Vector embedding for similarity search
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
  // Summary for context (optional, AI-generated)
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('source_chunks_source_idx').on(table.sourceId),
  clientIdx: index('source_chunks_client_idx').on(table.clientId),
  userIdx: index('source_chunks_user_idx').on(table.userId),
  // Note: Vector index needs to be created via raw SQL with pgvector
  // CREATE INDEX source_chunks_embedding_idx ON source_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
}));

// Inbound Emails - emails forwarded into the system
export const inboundEmails = pgTable('inbound_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }), // can be assigned later
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name'),
  toEmail: text('to_email').notNull(),
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  attachments: jsonb('attachments').$type<EmailAttachment[]>(), // array of attachment metadata
  rawHeaders: jsonb('raw_headers'),
  messageId: text('message_id'), // email message ID for threading
  inReplyTo: text('in_reply_to'), // for threading
  status: text('status').default('inbox'), // inbox, processed, archived
  // Context for when adding to sources - helps decide RAG inclusion
  sourceCategory: text('source_category'), // competitor_info, client_docs, internal, reference, etc.
  excludeFromRag: boolean('exclude_from_rag').default(false), // flag to exclude attachments/content from RAG
  contextNotes: text('context_notes'), // user notes about the email content type
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('inbound_emails_user_idx').on(table.userId),
  clientIdx: index('inbound_emails_client_idx').on(table.clientId),
  statusIdx: index('inbound_emails_status_idx').on(table.status),
}));

// Transcript Uploads - pasted/uploaded transcripts waiting to be assigned
export const transcriptUploads = pgTable('transcript_uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }), // can be assigned later
  // Transcript content
  title: text('title'), // AI-generated or user-provided title
  content: text('content').notNull(), // the raw transcript text
  // Optional metadata for when it becomes a session
  sessionDate: timestamp('session_date'), // when the session happened
  duration: integer('duration'), // in minutes
  notes: text('notes'), // any additional notes
  // Source info
  sourceType: text('source_type').default('paste'), // paste, upload, import
  originalFilename: text('original_filename'), // if uploaded as file
  // Processing
  status: text('status').default('inbox'), // inbox, assigned, archived
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }), // when assigned, the created session
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('transcript_uploads_user_idx').on(table.userId),
  clientIdx: index('transcript_uploads_client_idx').on(table.clientId),
  statusIdx: index('transcript_uploads_status_idx').on(table.status),
}));

// Methods - consulting frameworks/playbooks (user's own or templates)
export const methods = pgTable('methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // strategy, sales, product, discovery, etc.
  isTemplate: boolean('is_template').default(false), // global templates vs user's own
  steps: jsonb('steps').$type<MethodStep[]>(), // structured steps/phases
  templates: jsonb('templates'), // output templates, diagrams
  prompts: jsonb('prompts'), // AI prompts for each step
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('methods_user_idx').on(table.userId),
}));

// Personas - different AI modes/contexts (user-specific)
export const personas = pgTable('personas', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  temperature: integer('temperature').default(7), // 0-10, divided by 10 for actual temp
  model: text('model').default('claude-3-5-sonnet'),
  icon: text('icon'),
  isDefault: boolean('is_default').default(false), // system defaults
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('personas_user_idx').on(table.userId),
}));

// Sessions - live consulting sessions (calls, meetings)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  methodId: uuid('method_id').references(() => methods.id),
  title: text('title').notNull(),
  status: text('status').default('scheduled'), // scheduled, live, completed
  isHistoric: boolean('is_historic').default(false), // true for manually added past sessions
  gameplan: jsonb('gameplan').$type<GameplanItem[]>(), // pre-session plan/agenda
  transcript: text('transcript'), // full transcript
  transcriptChunks: jsonb('transcript_chunks'), // timestamped chunks
  summary: text('summary'), // AI-generated summary
  keyPoints: jsonb('key_points'), // extracted key points
  notes: text('notes'), // manual notes from the session
  recordingUrl: text('recording_url'), // audio/video recording
  attachments: jsonb('attachments').$type<SessionAttachment[]>(), // whiteboard images, docs, etc.
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  sessionDate: timestamp('session_date'), // for historic sessions - when it actually happened
  duration: integer('duration'), // in seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  clientIdx: index('sessions_client_idx').on(table.clientId),
}));

// Action Items - commitments, todos from sessions
export const actionItems = pgTable('action_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'set null' }),
  emailId: uuid('email_id').references(() => inboundEmails.id, { onDelete: 'set null' }),
  parentId: uuid('parent_id'), // For subtasks - references another action_item
  title: text('title').notNull(),
  description: text('description'),
  notes: text('notes'), // Additional notes on the task
  owner: text('owner'), // 'me', 'client', or specific name
  ownerType: text('owner_type').default('me'), // 'me' or 'client'
  dueDate: timestamp('due_date'),
  priority: text('priority').default('medium'), // low, medium, high, urgent
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  source: text('source').default('manual'), // manual, detected, note, transcript, email, session
  sourceContext: text('source_context'), // excerpt or context from source
  transcriptTimestamp: text('transcript_timestamp'), // when in the call it was mentioned
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('action_items_user_idx').on(table.userId),
  clientIdx: index('action_items_client_idx').on(table.clientId),
  statusIdx: index('action_items_status_idx').on(table.status),
  parentIdx: index('action_items_parent_idx').on(table.parentId),
}));

// Messages - chat history with AI (persisted conversations)
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id').references(() => personas.id),
  conversationId: uuid('conversation_id'), // groups messages into conversations
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // tokens used, model, latency, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('messages_user_idx').on(table.userId),
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
}));

// Suggestions - real-time AI suggestions during sessions
export const suggestions = pgTable('suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'talking_point', 'commitment', 'drift_warning', 'insight', 'question'
  content: text('content').notNull(),
  context: text('context'), // what triggered this suggestion
  priority: text('priority').default('medium'), // low, medium, high
  acted: boolean('acted').default(false), // did user act on it
  dismissed: boolean('dismissed').default(false), // did user dismiss it
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notes - freeform notes on clients (separate from sessions)
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  title: text('title'), // AI-generated if not provided
  content: text('content').notNull(),
  // Note classification
  noteType: text('note_type').default('general'), // general, future, competitor, partner, idea, reference
  labels: jsonb('labels').$type<string[]>(), // Custom labels/tags
  isPinned: boolean('is_pinned').default(false),
  // Processing
  addedToSources: boolean('added_to_sources').default(false), // Has this been indexed for RAG?
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('notes_client_idx').on(table.clientId),
}));

// Contacts - people at client organizations
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role'), // CEO, Product Manager, etc.
  isPrimary: boolean('is_primary').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('contacts_client_idx').on(table.clientId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  methods: many(methods),
  personas: many(personas),
  sessions: many(sessions),
  inboundEmails: many(inboundEmails),
  transcriptUploads: many(transcriptUploads),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  sources: many(sources),
  sourceChunks: many(sourceChunks),
  sessions: many(sessions),
  actionItems: many(actionItems),
  notes: many(notes),
  contacts: many(contacts),
  inboundEmails: many(inboundEmails),
  transcriptUploads: many(transcriptUploads),
  clarityDocument: one(clarityDocuments, { fields: [clients.id], references: [clarityDocuments.clientId] }),
  clarityInsights: many(clarityInsights),
  clarityMethodCanvas: one(clarityMethodCanvases, { fields: [clients.id], references: [clarityMethodCanvases.clientId] }),
  executionPlans: many(executionPlans),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  client: one(clients, { fields: [sources.clientId], references: [clients.id] }),
  user: one(users, { fields: [sources.userId], references: [users.id] }),
  chunks: many(sourceChunks),
}));

export const sourceChunksRelations = relations(sourceChunks, ({ one }) => ({
  source: one(sources, { fields: [sourceChunks.sourceId], references: [sources.id] }),
  client: one(clients, { fields: [sourceChunks.clientId], references: [clients.id] }),
  user: one(users, { fields: [sourceChunks.userId], references: [users.id] }),
}));

export const clarityDocumentsRelations = relations(clarityDocuments, ({ one }) => ({
  client: one(clients, { fields: [clarityDocuments.clientId], references: [clients.id] }),
  user: one(users, { fields: [clarityDocuments.userId], references: [users.id] }),
}));

export const clarityInsightsRelations = relations(clarityInsights, ({ one }) => ({
  client: one(clients, { fields: [clarityInsights.clientId], references: [clients.id] }),
  user: one(users, { fields: [clarityInsights.userId], references: [users.id] }),
}));

export const clarityMethodCanvasesRelations = relations(clarityMethodCanvases, ({ one, many }) => ({
  client: one(clients, { fields: [clarityMethodCanvases.clientId], references: [clients.id] }),
  user: one(users, { fields: [clarityMethodCanvases.userId], references: [users.id] }),
  executionPlans: many(executionPlans),
}));

export const executionPlansRelations = relations(executionPlans, ({ one }) => ({
  client: one(clients, { fields: [executionPlans.clientId], references: [clients.id] }),
  user: one(users, { fields: [executionPlans.userId], references: [users.id] }),
  clarityCanvas: one(clarityMethodCanvases, { fields: [executionPlans.sourceClarityCanvasId], references: [clarityMethodCanvases.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  client: one(clients, { fields: [sessions.clientId], references: [clients.id] }),
  method: one(methods, { fields: [sessions.methodId], references: [methods.id] }),
  actionItems: many(actionItems),
  suggestions: many(suggestions),
  messages: many(messages),
}));

export const inboundEmailsRelations = relations(inboundEmails, ({ one }) => ({
  user: one(users, { fields: [inboundEmails.userId], references: [users.id] }),
  client: one(clients, { fields: [inboundEmails.clientId], references: [clients.id] }),
}));

export const transcriptUploadsRelations = relations(transcriptUploads, ({ one }) => ({
  user: one(users, { fields: [transcriptUploads.userId], references: [users.id] }),
  client: one(clients, { fields: [transcriptUploads.clientId], references: [clients.id] }),
  session: one(sessions, { fields: [transcriptUploads.sessionId], references: [sessions.id] }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  user: one(users, { fields: [actionItems.userId], references: [users.id] }),
  client: one(clients, { fields: [actionItems.clientId], references: [clients.id] }),
  session: one(sessions, { fields: [actionItems.sessionId], references: [sessions.id] }),
  note: one(notes, { fields: [actionItems.noteId], references: [notes.id] }),
  email: one(inboundEmails, { fields: [actionItems.emailId], references: [inboundEmails.id] }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  client: one(clients, { fields: [notes.clientId], references: [clients.id] }),
  session: one(sessions, { fields: [notes.sessionId], references: [sessions.id] }),
  actionItems: many(actionItems),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
}));

export const methodsRelations = relations(methods, ({ one }) => ({
  user: one(users, { fields: [methods.userId], references: [users.id] }),
}));

export const personasRelations = relations(personas, ({ one }) => ({
  user: one(users, { fields: [personas.userId], references: [users.id] }),
}));

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  session: one(sessions, { fields: [suggestions.sessionId], references: [sessions.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, { fields: [messages.userId], references: [users.id] }),
  session: one(sessions, { fields: [messages.sessionId], references: [sessions.id] }),
  client: one(clients, { fields: [messages.clientId], references: [clients.id] }),
  persona: one(personas, { fields: [messages.personaId], references: [personas.id] }),
}));

// Types
export interface MethodStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration?: number; // estimated minutes
  prompts?: string[];
  outputs?: string[];
  questions?: string[];
}

export interface GameplanItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  blobUrl?: string; // stored in Vercel Blob
}

export interface SessionAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  blobUrl: string; // stored in Vercel Blob
  type: 'whiteboard' | 'document' | 'image' | 'recording' | 'other';
  description?: string;
  addedToSources?: boolean; // true if auto-added as a source
  sourceId?: string; // reference to the created source
}

// AI-generated summary for sources (editable by user)
export interface SourceAISummary {
  whatItIs: string; // Brief description of what this document/source is
  whyItMatters: string; // Why this is relevant for this client
  keyInsights: string[]; // Extracted key points
  suggestedUses: string[]; // How this could be used in consulting
  generatedAt: string; // ISO timestamp
  editedAt?: string; // If user edited it
  isEdited?: boolean;
}

// Prospect evaluation structure (from AI analysis)
export interface ProspectEvaluation {
  summary: string;
  whyWeLoveIt: string[];
  whyWeHateIt: string[];
  potentialBiases: string[];
  keyInsights: string[];
  marketPosition: string;
  competitiveAdvantage: string;
  biggestRisks: string[];
  recommendedApproach: string;
  fitScore: number; // 1-10
  evaluatedAt: string;
}

// Clarity document section (locked-in insights)
export interface ClaritySection {
  id: string;
  title: string;
  content: string;
  lockedAt: string;
  source?: string; // session ID or manual
}




// Clarity field metadata (status, source tracking per field)
export interface ClarityFieldMeta {
  status: 'draft' | 'confirmed' | 'locked';
  source?: string; // 'manual', 'ai', 'session:uuid', 'source:uuid'
  sourceContext?: string;
  confirmedAt?: string;
  lockedAt?: string;
  history?: Array<{
    content: string;
    changedAt: string;
    source: string;
  }>;
}

// Client Portal / Share Tokens - external sharing with clients
export const clientPortals = pgTable('client_portals', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: text('user_id').references(() => users.id).notNull(),

  // Access token - used in URL
  accessToken: text('access_token').notNull().unique(),

  // Portal settings
  name: text('name'), // Custom name for the portal (defaults to client name)
  welcomeMessage: text('welcome_message'), // Optional welcome message
  brandColor: text('brand_color'), // Custom brand color

  // Access control
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'), // Optional expiration

  // Analytics
  lastAccessedAt: timestamp('last_accessed_at'),
  accessCount: integer('access_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('client_portals_client_idx').on(table.clientId),
  tokenIdx: index('client_portals_token_idx').on(table.accessToken),
}));

// Shared Items - what's shared in each portal
export const sharedItems = pgTable('shared_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  portalId: uuid('portal_id').references(() => clientPortals.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),

  // What type of item is shared
  itemType: text('item_type').notNull(), // 'execution_plan', 'clarity_canvas', 'source', 'note'
  itemId: uuid('item_id').notNull(), // Reference to the actual item

  // Display settings
  displayName: text('display_name'), // Custom name (defaults to item's title)
  displayOrder: integer('display_order').default(0),

  // Access control for this specific item
  isVisible: boolean('is_visible').default(true),

  // Deep link token (for sharing specific items)
  deepLinkToken: text('deep_link_token').unique(),

  // Analytics
  viewCount: integer('view_count').default(0),
  lastViewedAt: timestamp('last_viewed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  portalIdx: index('shared_items_portal_idx').on(table.portalId),
  itemIdx: index('shared_items_item_idx').on(table.itemId),
  deepLinkIdx: index('shared_items_deep_link_idx').on(table.deepLinkToken),
}));

// Portal Access Log - track who accessed what
export const portalAccessLogs = pgTable('portal_access_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  portalId: uuid('portal_id').references(() => clientPortals.id, { onDelete: 'cascade' }).notNull(),
  sharedItemId: uuid('shared_item_id').references(() => sharedItems.id, { onDelete: 'set null' }),

  // Access details
  accessType: text('access_type').notNull(), // 'portal_view', 'item_view', 'download'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  portalIdx: index('portal_access_logs_portal_idx').on(table.portalId),
}));

// Relations for sharing
export const clientPortalsRelations = relations(clientPortals, ({ one, many }) => ({
  client: one(clients, { fields: [clientPortals.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientPortals.userId], references: [users.id] }),
  sharedItems: many(sharedItems),
  accessLogs: many(portalAccessLogs),
}));

export const sharedItemsRelations = relations(sharedItems, ({ one, many }) => ({
  portal: one(clientPortals, { fields: [sharedItems.portalId], references: [clientPortals.id] }),
  user: one(users, { fields: [sharedItems.userId], references: [users.id] }),
  accessLogs: many(portalAccessLogs),
}));

export const portalAccessLogsRelations = relations(portalAccessLogs, ({ one }) => ({
  portal: one(clientPortals, { fields: [portalAccessLogs.portalId], references: [clientPortals.id] }),
  sharedItem: one(sharedItems, { fields: [portalAccessLogs.sharedItemId], references: [sharedItems.id] }),
}));

// Export types for TypeScript
export type ClientPortal = typeof clientPortals.$inferSelect;
export type NewClientPortal = typeof clientPortals.$inferInsert;
export type SharedItem = typeof sharedItems.$inferSelect;
export type NewSharedItem = typeof sharedItems.$inferInsert;
export type PortalAccessLog = typeof portalAccessLogs.$inferSelect;

// Roadmap Builder - Visual directional roadmaps
export interface RoadmapSwimlane {
  key: string;
  label: string;
  color: string;
  icon?: string;
  order: number;
  isCustom?: boolean;
  collapsed?: boolean;
}

export interface RoadmapItemLink {
  id: string;
  type: 'prototype' | 'prd' | 'design' | 'doc' | 'jira' | 'github' | 'figma' | 'other';
  url: string;
  title?: string;
}

export interface RoadmapItemMetrics {
  effort?: string;
  impact?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  roi?: string;
}

export interface RoadmapTag {
  id: string;
  name: string;
  color: string;
}

export interface RoadmapSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  swimlaneKey: string;
  timeframe: 'now' | 'next' | 'later' | 'someday';
  order: number;
  status: 'idea' | 'planned' | 'in_progress' | 'done' | 'blocked' | 'cut';
  size?: 'xs' | 's' | 'm' | 'l' | 'xl';
  metrics?: RoadmapItemMetrics;
  notes?: string;
  why?: string;
  successCriteria?: string;
  risks?: string[];
  dependencies?: string[];
  links?: RoadmapItemLink[];
  tags?: string[];
  subtasks?: RoadmapSubtask[];
  source?: 'manual' | 'ai' | 'import';
  sourceContext?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapBacklogItem {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  suggestedSwimlane?: string;
  suggestedTimeframe?: 'now' | 'next' | 'later' | 'someday';
  suggestedSize?: 'xs' | 's' | 'm' | 'l' | 'xl';
  suggestedImpact?: 'low' | 'medium' | 'high' | 'critical';
  source?: 'manual' | 'ai' | 'import';
  sourceContext?: string;
  links?: RoadmapItemLink[];
  createdAt: string;
  order: number;
}

export interface RoadmapSuccessMetrics {
  quantitative: string[];
  qualitative: string[];
}

export const roadmaps = pgTable('roadmaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),

  // Header
  title: text('title').notNull(),
  objective: text('objective'),
  vision: text('vision'),
  planningHorizon: text('planning_horizon'),

  // Swimlanes (ordered)
  swimlanes: jsonb('swimlanes').$type<RoadmapSwimlane[]>(),

  // Items on the board
  items: jsonb('items').$type<RoadmapItem[]>(),

  // Backlog / dump area
  backlog: jsonb('backlog').$type<RoadmapBacklogItem[]>(),

  // Tags available in this roadmap
  tags: jsonb('tags').$type<RoadmapTag[]>(),

  // Success metrics
  successMetrics: jsonb('success_metrics').$type<RoadmapSuccessMetrics>(),

  // Notes
  notes: text('notes'),

  // AI conversation
  conversationId: uuid('conversation_id'),

  // Status
  status: text('status').default('draft'), // draft, active, review, archived

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('roadmaps_client_idx').on(table.clientId),
  userIdx: index('roadmaps_user_idx').on(table.userId),
  statusIdx: index('roadmaps_status_idx').on(table.status),
}));

export const roadmapsRelations = relations(roadmaps, ({ one }) => ({
  client: one(clients, { fields: [roadmaps.clientId], references: [clients.id] }),
  user: one(users, { fields: [roadmaps.userId], references: [users.id] }),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Method = typeof methods.$inferSelect;
export type NewMethod = typeof methods.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Suggestion = typeof suggestions.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type InboundEmail = typeof inboundEmails.$inferSelect;
export type NewInboundEmail = typeof inboundEmails.$inferInsert;
export type ClarityDocument = typeof clarityDocuments.$inferSelect;
export type NewClarityDocument = typeof clarityDocuments.$inferInsert;
export type ClarityInsight = typeof clarityInsights.$inferSelect;
export type NewClarityInsight = typeof clarityInsights.$inferInsert;
export type SourceChunk = typeof sourceChunks.$inferSelect;
export type NewSourceChunk = typeof sourceChunks.$inferInsert;
export type ClarityMethodCanvas = typeof clarityMethodCanvases.$inferSelect;
export type NewClarityMethodCanvas = typeof clarityMethodCanvases.$inferInsert;
export type ExecutionPlan = typeof executionPlans.$inferSelect;
export type NewExecutionPlan = typeof executionPlans.$inferInsert;
export type Roadmap = typeof roadmaps.$inferSelect;
export type NewRoadmap = typeof roadmaps.$inferInsert;
export type TranscriptUpload = typeof transcriptUploads.$inferSelect;
export type NewTranscriptUpload = typeof transcriptUploads.$inferInsert;
