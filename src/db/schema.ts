import { pgTable, text, timestamp, jsonb, uuid, integer, boolean } from 'drizzle-orm/pg-core';

// Clients - each consulting engagement
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  industry: text('industry'),
  description: text('description'),
  status: text('status').default('active'), // active, paused, completed
  metadata: jsonb('metadata'), // flexible storage for client-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sources - documents, websites, repos linked to a client
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  type: text('type').notNull(), // 'document', 'website', 'repo', 'folder', 'recording'
  name: text('name').notNull(),
  url: text('url'), // for websites, repos
  blobUrl: text('blob_url'), // for uploaded files (Vercel Blob)
  content: text('content'), // extracted/scraped text content
  metadata: jsonb('metadata'), // pages crawled, file size, etc.
  processingStatus: text('processing_status').default('pending'), // pending, processing, completed, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Methods - your consulting frameworks/playbooks
export const methods = pgTable('methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // strategy, sales, product, etc.
  steps: jsonb('steps'), // structured steps/phases
  templates: jsonb('templates'), // output templates, diagrams
  prompts: jsonb('prompts'), // AI prompts for each step
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Personas - different AI modes/contexts
export const personas = pgTable('personas', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt').notNull(),
  temperature: integer('temperature').default(7), // 0-10, divided by 10 for actual temp
  model: text('model').default('claude-3-5-sonnet'),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sessions - live consulting sessions (calls, meetings)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  methodId: uuid('method_id').references(() => methods.id),
  title: text('title').notNull(),
  status: text('status').default('scheduled'), // scheduled, live, completed
  gameplan: text('gameplan'), // pre-session plan/agenda
  transcript: text('transcript'), // full transcript
  summary: text('summary'), // AI-generated summary
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Action Items - commitments, todos from sessions
export const actionItems = pgTable('action_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner'), // who's responsible
  dueDate: timestamp('due_date'),
  status: text('status').default('pending'), // pending, in_progress, completed
  source: text('source'), // 'detected' (AI) or 'manual'
  timestamp: text('timestamp'), // when in the call it was mentioned
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Messages - chat history with AI
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id),
  clientId: uuid('client_id').references(() => clients.id),
  personaId: uuid('persona_id').references(() => personas.id),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // tokens used, model, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Suggestions - real-time AI suggestions during sessions
export const suggestions = pgTable('suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  type: text('type').notNull(), // 'talking_point', 'commitment', 'drift_warning', 'insight'
  content: text('content').notNull(),
  context: text('context'), // what triggered this suggestion
  acted: boolean('acted').default(false), // did user act on it
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types for TypeScript
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Method = typeof methods.$inferSelect;
export type NewMethod = typeof methods.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ActionItem = typeof actionItems.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
