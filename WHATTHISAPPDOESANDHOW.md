# ConsultantOS - Technical Documentation

## What Is This?

ConsultantOS is an AI-powered consulting co-pilot designed for startup consultants. It helps manage clients, track commitments from calls, store knowledge sources, and provide real-time AI assistance during live sessions.

**Target User:** Independent consultants who work with multiple startup clients across various domains (sales, strategy, product, fundraising, etc.)

---

## Core Features

### 1. Client Management (`/clients`)
- Create and manage multiple client profiles
- Each client has their own sources, sessions, action items, and contacts
- Track engagement status, industry, and metadata

### 2. Source Management (`/sources`)
- Upload documents (PDFs, Word docs, text files)
- Add website URLs for crawling
- Connect GitHub repositories
- All sources are chunked and stored for AI context retrieval

### 3. Live Sessions (`/session`)
- Real-time call recording with Deepgram transcription
- AI generates suggestions during the call based on:
  - Client's stored sources
  - Consultant's methods/frameworks
  - Conversation context
- Auto-detects commitments and creates action items
- Generates post-call summaries and key points

### 4. Methods & Frameworks (`/methods`)
- Build reusable consulting playbooks
- Define steps, templates, and AI prompts
- Apply methods to client sessions for structured guidance

### 5. AI Personas (`/personas`)
- Create different AI personalities with custom system prompts
- Each persona can have different temperature/model settings
- Use cases: "Sales Coach", "Strategy Advisor", "Technical Reviewer"

### 6. Chat Interface (`/chat`)
- Context-aware AI chat
- Can scope conversations to specific clients
- Uses client sources as RAG context

### 7. Email Ingestion (`/emails`)
- Forward emails to your unique ingest address
- Emails with attachments appear in inbox
- Assign emails/attachments to client sources

### 8. Action Items Tracking
- Auto-captured from session transcripts
- Manual creation supported
- Track owner (you vs. client), due dates, priority, status

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | Neon PostgreSQL + Drizzle ORM |
| File Storage | Vercel Blob |
| AI | Vercel AI SDK (OpenAI, Anthropic) |
| Transcription | Deepgram (WebSocket) |
| Styling | Tailwind CSS + Radix UI |
| Deployment | Vercel |

---

## Project Structure

```
consultantos/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Auth pages (sign-in, sign-up)
│   │   ├── (dashboard)/            # Protected app pages
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── clients/            # Client management
│   │   │   ├── session/            # Live sessions
│   │   │   ├── methods/            # Frameworks builder
│   │   │   ├── personas/           # AI personas
│   │   │   ├── chat/               # AI chat interface
│   │   │   ├── emails/             # Email inbox
│   │   │   ├── sources/            # Source management
│   │   │   ├── onboarding/         # New user onboarding
│   │   │   └── layout.tsx          # Dashboard layout + auth guard
│   │   ├── (marketing)/            # Public pages
│   │   │   └── page.tsx            # Landing page
│   │   ├── api/
│   │   │   ├── chat/               # AI chat endpoint
│   │   │   ├── clients/            # Client CRUD
│   │   │   ├── emails/             # Email management
│   │   │   ├── methods/            # Methods CRUD
│   │   │   ├── personas/           # Personas CRUD
│   │   │   ├── sessions/           # Session management
│   │   │   ├── sources/            # Source processing
│   │   │   ├── transcribe/         # Deepgram transcription
│   │   │   ├── upload/             # File uploads to Blob
│   │   │   ├── user/               # User profile + onboarding
│   │   │   └── webhooks/
│   │   │       ├── clerk/          # Clerk user sync
│   │   │       └── email/          # Inbound email webhook
│   │   ├── globals.css
│   │   └── layout.tsx              # Root layout with ClerkProvider
│   │
│   ├── components/
│   │   ├── ui/                     # Reusable UI components (shadcn-style)
│   │   ├── landing/                # Landing page components
│   │   ├── sidebar.tsx             # Dashboard navigation
│   │   ├── onboarding-guard.tsx    # Redirects if onboarding incomplete
│   │   ├── file-upload.tsx         # Drag-drop file uploader
│   │   ├── source-adder.tsx        # Add sources modal
│   │   └── action-items-list.tsx   # Action items component
│   │
│   ├── db/
│   │   ├── index.ts                # Drizzle client
│   │   └── schema.ts               # Database schema (12 tables)
│   │
│   ├── lib/
│   │   ├── ai.ts                   # AI helper functions
│   │   ├── auth.ts                 # Auth utilities
│   │   ├── transcription.ts        # Deepgram client
│   │   ├── utils.ts                # General utilities
│   │   └── db/                     # Database query helpers
│   │       ├── clients.ts
│   │       ├── sessions.ts
│   │       ├── sources.ts
│   │       ├── methods.ts
│   │       ├── personas.ts
│   │       └── action-items.ts
│   │
│   ├── hooks/                      # React hooks
│   │   ├── use-clients.ts
│   │   ├── use-chat.ts
│   │   └── use-action-items.ts
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   │
│   └── middleware.ts               # Clerk auth middleware
│
├── drizzle/                        # Generated migrations
├── drizzle.config.ts               # Drizzle Kit config
├── .env.local                      # Environment variables (not in git)
├── .env.example                    # Example env file
└── package.json
```

---

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Consultant profiles (synced from Clerk) |
| `clients` | Client companies/projects |
| `contacts` | People at client companies |
| `sources` | Documents, URLs, repos per client |
| `sessions` | Recorded calls/meetings |
| `methods` | Consulting frameworks/playbooks |
| `personas` | AI personality configurations |
| `action_items` | Tasks/commitments from sessions |
| `messages` | Chat history |
| `notes` | Freeform notes per client |
| `suggestions` | AI suggestions during sessions |
| `inbound_emails` | Forwarded emails |

### Key Relationships

```
users (1) ──< (many) clients
clients (1) ──< (many) sources
clients (1) ──< (many) sessions
clients (1) ──< (many) action_items
clients (1) ──< (many) contacts
sessions (1) ──< (many) suggestions
sessions (1) ──< (many) messages
users (1) ──< (many) methods
users (1) ──< (many) personas
users (1) ──< (many) inbound_emails
```

### Multi-Tenancy

All tables have a `user_id` column that references the Clerk user ID. Every query is scoped by user:

```typescript
// Example: Get clients for current user
const userClients = await db
  .select()
  .from(clients)
  .where(eq(clients.userId, userId));
```

---

## Authentication Flow

1. **Clerk handles auth** - Sign up/in via `@clerk/nextjs`
2. **Webhook syncs users** - `POST /api/webhooks/clerk` creates user record on signup
3. **Middleware protects routes** - `src/middleware.ts` requires auth for `/dashboard/*`
4. **Onboarding guard** - `OnboardingGuard` component redirects new users to `/onboarding`

### Getting Current User

```typescript
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/auth";

// In API route
const { userId } = await auth();
const user = await getUserById(userId);
```

---

## Key Flows

### 1. Live Session Recording

```
User starts session
    ↓
Deepgram WebSocket opens (client-side)
    ↓
Audio streamed to Deepgram
    ↓
Transcripts received in real-time
    ↓
Every N seconds, send transcript to AI
    ↓
AI generates suggestions based on:
    - Current transcript
    - Client sources
    - Selected method
    ↓
Suggestions displayed to user
    ↓
Session ends → Generate summary + action items
```

**Files involved:**
- `src/app/(dashboard)/session/[id]/page.tsx` - Session UI
- `src/lib/transcription.ts` - Deepgram client
- `src/app/api/session/suggestions/route.ts` - AI suggestions endpoint
- `src/app/api/sessions/[id]/route.ts` - Session CRUD

### 2. Source Processing

```
User uploads file or adds URL
    ↓
File → Uploaded to Vercel Blob
URL → Fetched and parsed
    ↓
Content extracted (PDF parse, HTML strip, etc.)
    ↓
Content chunked for RAG
    ↓
Stored in sources table
```

**Files involved:**
- `src/app/api/upload/route.ts` - File upload
- `src/app/api/sources/[id]/process/route.ts` - Content processing
- `src/lib/db/sources.ts` - Source queries

### 3. AI Chat with Context

```
User sends message
    ↓
If client selected:
    - Fetch client's sources
    - Build context from source chunks
    ↓
Send to AI with:
    - System prompt (persona or default)
    - Context from sources
    - Conversation history
    ↓
Stream response back
```

**Files involved:**
- `src/app/(dashboard)/chat/page.tsx` - Chat UI
- `src/app/api/chat/route.ts` - Chat endpoint
- `src/lib/ai.ts` - AI helpers

### 4. Email Ingestion

```
User forwards email to inbox-{userId}@ingest.consultantos.com
    ↓
Email provider (SendGrid/Mailgun/Postmark) sends webhook
    ↓
POST /api/webhooks/email
    ↓
Parse email: from, to, subject, body, attachments
    ↓
Store in inbound_emails table
    ↓
User can view in /emails and assign to client
```

**Files involved:**
- `src/app/api/webhooks/email/route.ts` - Webhook handler
- `src/app/(dashboard)/emails/page.tsx` - Email inbox UI
- `src/app/api/emails/[id]/route.ts` - Email actions

---

## Environment Variables

```env
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Optional, for webhook verification

# Database (Neon)
DATABASE_URL=postgresql://...

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional

# Transcription
DEEPGRAM_API_KEY=...
NEXT_PUBLIC_DEEPGRAM_API_KEY=...  # Same key, needed client-side
```

---

## Local Development Setup

```bash
# 1. Clone and install
git clone https://github.com/jdsinclair/consultantos.git
cd consultantos
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in your API keys

# 3. Push database schema
npm run db:push

# 4. Run dev server
npm run dev
```

### Useful Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run db:push      # Push schema to database
npm run db:generate  # Generate migration files
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

---

## API Routes Reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/clients` | List/create clients |
| GET/PATCH/DELETE | `/api/clients/[id]` | Single client ops |
| GET/POST | `/api/clients/[id]/sources` | Client's sources |
| GET/POST | `/api/sessions` | List/create sessions |
| GET/PATCH | `/api/sessions/[id]` | Session details |
| POST | `/api/session/suggestions` | Get AI suggestions |
| POST | `/api/chat` | AI chat (streaming) |
| POST | `/api/transcribe` | Deepgram transcription |
| POST | `/api/upload` | Upload to Blob |
| GET/POST | `/api/methods` | Methods CRUD |
| GET/POST | `/api/personas` | Personas CRUD |
| GET/PATCH | `/api/user` | User profile |
| PATCH/POST | `/api/user/onboarding` | Onboarding progress |
| GET | `/api/emails` | List emails |
| GET/PATCH/POST | `/api/emails/[id]` | Email actions |
| POST | `/api/action-items` | Create action item |
| PATCH | `/api/action-items/[id]` | Update action item |
| POST | `/api/webhooks/clerk` | Clerk user sync |
| POST | `/api/webhooks/email` | Email ingestion |

---

## Common Tasks

### Add a New Database Table

1. Edit `src/db/schema.ts`:
```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  // ... columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

2. Push to database:
```bash
npm run db:push
```

### Add a New API Route

Create file at `src/app/api/[route]/route.ts`:
```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here
  return NextResponse.json({ data: "..." });
}
```

### Add a New Dashboard Page

Create file at `src/app/(dashboard)/[page]/page.tsx`:
```typescript
export default function NewPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

Add to sidebar in `src/components/sidebar.tsx`:
```typescript
const navigation = [
  // ... existing items
  { name: "New Page", href: "/newpage", icon: SomeIcon },
];
```

---

## Deployment

The app is configured for Vercel:

1. Connect repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

Vercel auto-detects Next.js and configures:
- Serverless functions for API routes
- Edge middleware for auth
- Static generation for marketing pages

---

## Known Limitations / TODOs

1. **Real-time transcription** - Requires Deepgram WebSocket, won't work in environments that block WebSockets
2. **Email ingestion** - Needs email provider webhook setup (SendGrid, Mailgun, or Postmark)
3. **Source processing** - Large PDFs may timeout on serverless
4. **No vector DB yet** - Sources are chunked but not embedded; simple text search for now

---

## Questions?

Check these files first:
- **Schema questions:** `src/db/schema.ts`
- **API patterns:** Any file in `src/app/api/`
- **UI patterns:** `src/app/(dashboard)/clients/page.tsx` (good example)
- **Auth patterns:** `src/lib/auth.ts`
