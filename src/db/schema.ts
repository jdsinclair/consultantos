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
  sourceType: text('source_type'), // email, referral, inbound, outreach
  sourceNotes: text('source_notes'),
  metadata: jsonb('metadata'), // flexible storage for client-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('clients_user_idx').on(table.userId),
  statusIdx: index('clients_status_idx').on(table.status),
}));

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

// Sources - documents, websites, repos, local folders linked to a client
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'document', 'website', 'repo', 'folder', 'recording', 'local_folder', 'email'
  name: text('name').notNull(),
  url: text('url'), // for websites, repos
  localPath: text('local_path'), // for local folder sources
  blobUrl: text('blob_url'), // for uploaded files (Vercel Blob)
  content: text('content'), // extracted/scraped text content (can be large)
  contentChunks: jsonb('content_chunks'), // chunked content for RAG
  fileType: text('file_type'), // pdf, docx, pptx, md, etc.
  fileSize: integer('file_size'), // in bytes
  metadata: jsonb('metadata'), // pages crawled, last sync, etc.
  processingStatus: text('processing_status').default('pending'), // pending, processing, completed, failed
  processingError: text('processing_error'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('sources_client_idx').on(table.clientId),
  userIdx: index('sources_user_idx').on(table.userId),
}));

// Source Chunks - chunked content with embeddings for RAG
export const sourceChunks = pgTable('source_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
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
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('inbound_emails_user_idx').on(table.userId),
  clientIdx: index('inbound_emails_client_idx').on(table.clientId),
  statusIdx: index('inbound_emails_status_idx').on(table.status),
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
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner'), // 'me', 'client', or specific name
  ownerType: text('owner_type').default('me'), // 'me' or 'client'
  dueDate: timestamp('due_date'),
  priority: text('priority').default('medium'), // low, medium, high, urgent
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  source: text('source').default('manual'), // manual, detected, note, transcript, email
  sourceContext: text('source_context'), // excerpt or context from source
  transcriptTimestamp: text('transcript_timestamp'), // when in the call it was mentioned
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('action_items_user_idx').on(table.userId),
  clientIdx: index('action_items_client_idx').on(table.clientId),
  statusIdx: index('action_items_status_idx').on(table.status),
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
  title: text('title'),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').default(false),
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
  clarityDocument: one(clarityDocuments, { fields: [clients.id], references: [clarityDocuments.clientId] }),
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
export type SourceChunk = typeof sourceChunks.$inferSelect;
export type NewSourceChunk = typeof sourceChunks.$inferInsert;
