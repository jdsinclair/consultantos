import { pgTable, text, timestamp, jsonb, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  company: text('company'),
  industry: text('industry'),
  website: text('website'),
  description: text('description'),
  status: text('status').default('active'), // active, paused, completed
  color: text('color'), // for UI display
  metadata: jsonb('metadata'), // flexible storage for client-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('clients_user_idx').on(table.userId),
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
  gameplan: jsonb('gameplan').$type<GameplanItem[]>(), // pre-session plan/agenda
  transcript: text('transcript'), // full transcript
  transcriptChunks: jsonb('transcript_chunks'), // timestamped chunks
  summary: text('summary'), // AI-generated summary
  keyPoints: jsonb('key_points'), // extracted key points
  recordingUrl: text('recording_url'), // audio/video recording
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
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
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner'), // 'me', 'client', or specific name
  ownerType: text('owner_type').default('me'), // 'me' or 'client'
  dueDate: timestamp('due_date'),
  priority: text('priority').default('medium'), // low, medium, high, urgent
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  source: text('source').default('manual'), // 'detected' (AI) or 'manual'
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
  sessions: many(sessions),
  actionItems: many(actionItems),
  notes: many(notes),
  contacts: many(contacts),
  inboundEmails: many(inboundEmails),
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
