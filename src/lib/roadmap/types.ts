// Roadmap Builder Types and Constants
// Visual directional roadmap for consulting clients

export type RoadmapItemStatus = 'idea' | 'planned' | 'in_progress' | 'done' | 'blocked' | 'cut';
export type RoadmapItemSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type RoadmapItemImpact = 'low' | 'medium' | 'high' | 'critical';
export type RoadmapTimeframe = 'now' | 'next' | 'later' | 'someday';
export type RoadmapViewMode = 'board' | 'timeline' | 'backlog';

// Swimlane categories with display labels and colors
export const SWIMLANE_CATEGORIES = {
  infrastructure: { label: 'Infrastructure', color: '#6366f1', icon: 'server' },
  techDebt: { label: 'Tech Debt', color: '#f59e0b', icon: 'wrench' },
  features10x: { label: '10x Features', color: '#10b981', icon: 'rocket' },
  ux: { label: 'UX / Design', color: '#8b5cf6', icon: 'palette' },
  retention: { label: 'Retention', color: '#ec4899', icon: 'heart' },
  reporting: { label: 'Reporting', color: '#06b6d4', icon: 'chart' },
  orchestration: { label: 'Orchestration', color: '#f97316', icon: 'workflow' },
  growth: { label: 'Growth', color: '#22c55e', icon: 'trending-up' },
  operations: { label: 'Operations', color: '#64748b', icon: 'settings' },
  security: { label: 'Security', color: '#ef4444', icon: 'shield' },
  integrations: { label: 'Integrations', color: '#3b82f6', icon: 'plug' },
  mobile: { label: 'Mobile', color: '#a855f7', icon: 'smartphone' },
} as const;

// SwimlaneKey can be a predefined category or custom_* for custom lanes
export type SwimlaneKey = string;

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
  effort?: string; // "2 weeks", "1 sprint", etc.
  impact?: RoadmapItemImpact;
  confidence?: number; // 1-10
  roi?: string; // Qualitative ROI description
}

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;

  // Positioning
  swimlaneKey: string;
  timeframe: RoadmapTimeframe;
  order: number;

  // Status
  status: RoadmapItemStatus;

  // Planning
  size?: RoadmapItemSize;
  metrics?: RoadmapItemMetrics;

  // Context
  notes?: string;
  why?: string; // Why are we doing this?
  successCriteria?: string; // How do we know it worked?
  risks?: string[]; // Known risks
  dependencies?: string[]; // Item IDs this depends on

  // Links
  links?: RoadmapItemLink[];

  // Source tracking
  source?: 'manual' | 'ai' | 'import';
  sourceContext?: string; // Where it came from (doc name, conversation excerpt)

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapBacklogItem {
  id: string;
  title: string;
  description?: string;
  notes?: string;

  // Suggested placement (can be overridden when moving to board)
  suggestedSwimlane?: string;
  suggestedTimeframe?: RoadmapTimeframe;
  suggestedSize?: RoadmapItemSize;
  suggestedImpact?: RoadmapItemImpact;

  // Source
  source?: 'manual' | 'ai' | 'import';
  sourceContext?: string;

  // Links
  links?: RoadmapItemLink[];

  // Metadata
  createdAt: string;
  order: number;
}

export interface Roadmap {
  id: string;
  clientId: string;
  userId: string;

  // Header
  title: string;
  objective?: string; // What are we building towards?
  vision?: string; // The big picture

  // Time context
  planningHorizon?: string; // "Q1 2026", "6 months", etc.

  // Swimlanes (ordered)
  swimlanes: RoadmapSwimlane[];

  // Items on the board
  items: RoadmapItem[];

  // Backlog / dump area
  backlog: RoadmapBacklogItem[];

  // Success metrics for the overall roadmap
  successMetrics?: {
    quantitative: string[];
    qualitative: string[];
  };

  // Notes
  notes?: string;

  // AI conversation
  conversationId?: string;

  // State
  status: 'draft' | 'active' | 'review' | 'archived';

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Timeframe configuration
export const TIMEFRAME_CONFIG = {
  now: {
    label: 'Now',
    sublabel: '0-30 days',
    color: '#22c55e',
    description: 'Currently in progress or starting immediately',
  },
  next: {
    label: 'Next',
    sublabel: '1-3 months',
    color: '#3b82f6',
    description: 'Planned for the near term',
  },
  later: {
    label: 'Later',
    sublabel: '3-6 months',
    color: '#8b5cf6',
    description: 'On the radar, needs more definition',
  },
  someday: {
    label: 'Someday',
    sublabel: '6+ months',
    color: '#64748b',
    description: 'Good idea, not yet prioritized',
  },
} as const;

// Status configuration
export const STATUS_CONFIG = {
  idea: { label: 'Idea', color: '#94a3b8', icon: 'lightbulb' },
  planned: { label: 'Planned', color: '#3b82f6', icon: 'calendar' },
  in_progress: { label: 'In Progress', color: '#22c55e', icon: 'play' },
  done: { label: 'Done', color: '#10b981', icon: 'check' },
  blocked: { label: 'Blocked', color: '#ef4444', icon: 'alert-triangle' },
  cut: { label: 'Cut', color: '#6b7280', icon: 'x' },
} as const;

// Size configuration (T-shirt sizing)
export const SIZE_CONFIG = {
  xs: { label: 'XS', description: '< 1 day', effort: 1 },
  s: { label: 'S', description: '1-2 days', effort: 2 },
  m: { label: 'M', description: '3-5 days', effort: 5 },
  l: { label: 'L', description: '1-2 weeks', effort: 10 },
  xl: { label: 'XL', description: '2+ weeks', effort: 20 },
} as const;

// Impact configuration
export const IMPACT_CONFIG = {
  low: { label: 'Low', color: '#94a3b8', score: 1 },
  medium: { label: 'Medium', color: '#f59e0b', score: 2 },
  high: { label: 'High', color: '#f97316', score: 3 },
  critical: { label: 'Critical', color: '#ef4444', score: 4 },
} as const;

// Default swimlanes for new roadmaps
export const DEFAULT_SWIMLANES: RoadmapSwimlane[] = [
  { key: 'features10x', label: '10x Features', color: '#10b981', order: 0 },
  { key: 'ux', label: 'UX / Design', color: '#8b5cf6', order: 1 },
  { key: 'infrastructure', label: 'Infrastructure', color: '#6366f1', order: 2 },
  { key: 'techDebt', label: 'Tech Debt', color: '#f59e0b', order: 3 },
  { key: 'operations', label: 'Operations', color: '#64748b', order: 4 },
];

// Empty roadmap template
export const EMPTY_ROADMAP: Omit<Roadmap, 'id' | 'clientId' | 'userId' | 'createdAt' | 'updatedAt'> = {
  title: 'Product Roadmap',
  objective: '',
  vision: '',
  planningHorizon: '',
  swimlanes: [...DEFAULT_SWIMLANES],
  items: [],
  backlog: [],
  successMetrics: {
    quantitative: [],
    qualitative: [],
  },
  notes: '',
  conversationId: undefined,
  status: 'draft',
};

// AI suggestion patterns for parsing
export const AI_PATTERNS = {
  addItem: /🗂️\s*ADD ITEM:\s*["']?([^"'\n]+)["']?\s*(?:to\s+)?(?:swimlane:?\s*)?["']?([^"'\n]*)["']?\s*(?:timeframe:?\s*)?["']?([^"'\n]*)["']?/gi,
  addSwimlane: /🏊\s*ADD SWIMLANE:\s*["']?([^"'\n]+)["']?/gi,
  addBacklog: /📦\s*BACKLOG:\s*["']?([^"'\n]+)["']?/gi,
  addMetric: /📊\s*METRIC:\s*["']?([^"'\n]+)["']?/gi,
  bulkItems: /(?:📋|🗒️)\s*ITEMS:\s*\n?((?:[-•*]\s*.+\n?)+)/gi,
};

// Link type icons
export const LINK_TYPE_CONFIG = {
  prototype: { label: 'Prototype', icon: 'play-circle' },
  prd: { label: 'PRD', icon: 'file-text' },
  design: { label: 'Design', icon: 'palette' },
  doc: { label: 'Document', icon: 'file' },
  jira: { label: 'Jira', icon: 'ticket' },
  github: { label: 'GitHub', icon: 'github' },
  figma: { label: 'Figma', icon: 'figma' },
  other: { label: 'Link', icon: 'link' },
} as const;

// Guidance for consultants
export const ROADMAP_GUIDANCE = {
  objective: {
    question: "What are we building towards?",
    howToThink: "This should be the north star - what does success look like in 6-12 months?",
    examples: ["Launch self-serve product tier", "10x customer onboarding speed", "Achieve SOC2 compliance"],
  },
  swimlanes: {
    question: "What are the key areas of investment?",
    howToThink: "Group work by theme, not by team. What categories of work matter most?",
    tips: [
      "Start with 3-5 swimlanes max",
      "Add more as patterns emerge",
      "Custom swimlanes for client-specific themes",
    ],
  },
  timeframes: {
    question: "When does this need to happen?",
    howToThink: "Now = committed, Next = planned, Later = directional, Someday = ideas",
    tips: [
      "Now should have clear owners",
      "Next should have rough scoping",
      "Later is for alignment",
      "Someday is the parking lot",
    ],
  },
  backlog: {
    question: "What's the dump zone for?",
    howToThink: "Capture everything first, sort later. Don't let ideas get lost.",
    tips: [
      "Dump raw ideas quickly",
      "Add context later",
      "Drag to board when ready",
      "AI can help categorize",
    ],
  },
};
