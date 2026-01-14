// Core domain types

export interface Client {
  id: string;
  name: string;
  company?: string;
  industry?: string;
  description?: string;
  status: "active" | "paused" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

export interface Source {
  id: string;
  clientId: string;
  type: "document" | "website" | "repo" | "folder" | "recording";
  name: string;
  url?: string;
  blobUrl?: string;
  content?: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Method {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: MethodStep[];
  templates?: Record<string, string>;
  prompts?: Record<string, string>;
}

export interface MethodStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  prompts?: string[];
  outputs?: string[];
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  temperature: number;
  model: string;
  icon?: string;
}

export interface Session {
  id: string;
  clientId: string;
  methodId?: string;
  title: string;
  status: "scheduled" | "live" | "completed";
  gameplan?: GameplanItem[];
  transcript?: string;
  summary?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface GameplanItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface ActionItem {
  id: string;
  sessionId?: string;
  clientId: string;
  title: string;
  description?: string;
  owner?: string;
  dueDate?: Date;
  status: "pending" | "in_progress" | "completed";
  source: "detected" | "manual";
  timestamp?: string;
}

export interface Suggestion {
  id: string;
  sessionId: string;
  type: "talking_point" | "commitment" | "drift_warning" | "insight";
  content: string;
  context?: string;
  priority: "high" | "medium" | "low";
  acted: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  sessionId?: string;
  clientId?: string;
  personaId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}
