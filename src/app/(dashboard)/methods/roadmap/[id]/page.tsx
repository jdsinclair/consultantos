"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChat, Message } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Map,
  Target,
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Save,
  Loader2,
  MessageSquare,
  X,
  FileText,
  BarChart3,
  StickyNote,
  Wand2,
  Share2,
  ExternalLink,
  Download,
  Link2,
  Package,
  GripVertical,
  LayoutGrid,
  List,
  Clock,
  AlertTriangle,
  Lightbulb,
  Link as LinkIcon,
  MoreVertical,
  ArrowRight,
  MoveRight,
  Layers,
  Zap,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/components/chat";
import {
  TIMEFRAME_CONFIG,
  STATUS_CONFIG,
  SIZE_CONFIG,
  IMPACT_CONFIG,
  SWIMLANE_CATEGORIES,
  LINK_TYPE_CONFIG,
  TAG_COLORS,
} from "@/lib/roadmap/types";
import type {
  RoadmapItem,
  RoadmapBacklogItem,
  RoadmapSwimlane,
  RoadmapTimeframe,
  RoadmapItemStatus,
  RoadmapItemSize,
  RoadmapItemImpact,
  RoadmapItemLink,
  RoadmapTag,
  RoadmapSubtask,
} from "@/lib/roadmap/types";

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface Source {
  id: string;
  name: string;
  type: string;
}

interface Persona {
  id: string;
  name: string;
  description?: string;
}

interface Roadmap {
  id: string;
  clientId: string;
  title: string;
  objective?: string;
  vision?: string;
  planningHorizon?: string;
  swimlanes: RoadmapSwimlane[];
  items: RoadmapItem[];
  backlog: RoadmapBacklogItem[];
  tags?: RoadmapTag[];
  successMetrics?: {
    quantitative: string[];
    qualitative: string[];
  };
  notes?: string;
  conversationId?: string;
  status: string;
  client?: Client;
}

type ViewMode = 'board' | 'backlog';

export default function RoadmapPage({ params }: { params: { id: string } }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [editingHeader, setEditingHeader] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Set<string>>(new Set());
  const [newBacklogText, setNewBacklogText] = useState("");
  const [editingSwimlaneKey, setEditingSwimlaneKey] = useState<string | null>(null);
  const [editingSwimlaneLabel, setEditingSwimlaneLabel] = useState("");
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ swimlane: string; timeframe: RoadmapTimeframe } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat context
  const [sources, setSources] = useState<Source[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat history storage key
  const chatStorageKey = `roadmap-chat-${params.id}`;

  // Load persisted chat history
  const getInitialMessages = (): Message[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(chatStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [];
  };

  // AI Chat
  const { messages, append, setMessages, isLoading: chatLoading } = useChat({
    api: "/api/chat",
    body: {
      context: "roadmap",
      clientId: roadmap?.clientId,
      personaId: selectedPersona,
      roadmap: roadmap,
    },
    initialMessages: getInitialMessages(),
    onFinish: () => {
      if (typeof window !== "undefined") {
        localStorage.setItem(chatStorageKey, JSON.stringify(messages));
      }
    },
  });

  // Persist messages
  useEffect(() => {
    if (messages.length > 0 && typeof window !== "undefined") {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [messages, chatStorageKey]);

  // Load roadmap
  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRoadmap(data);
        // Expand all swimlanes by default
        if (data.swimlanes) {
          setExpandedSwimlanes(new Set(data.swimlanes.map((s: RoadmapSwimlane) => s.key)));
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Load sources
  useEffect(() => {
    if (!roadmap?.clientId) return;
    fetch(`/api/clients/${roadmap.clientId}/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch((e) => console.error("Failed to fetch sources:", e));
  }, [roadmap?.clientId]);

  // Load personas
  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then(setPersonas)
      .catch((e) => console.error("Failed to fetch personas:", e));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save
  const autoSave = useCallback((updates: Partial<Roadmap>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/roadmaps/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        console.error("Auto-save error:", e);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [params.id]);

  const updateRoadmap = (updates: Partial<Roadmap>) => {
    setRoadmap((prev) => prev ? { ...prev, ...updates } : prev);
    autoSave(updates);
  };

  // Item management
  const addItem = (swimlaneKey: string, timeframe: RoadmapTimeframe, title: string = "") => {
    const now = new Date().toISOString();
    const newItem: RoadmapItem = {
      id: crypto.randomUUID(),
      title: title || "New Item",
      swimlaneKey,
      timeframe,
      order: (roadmap?.items?.filter(i => i.swimlaneKey === swimlaneKey && i.timeframe === timeframe).length || 0),
      status: 'idea',
      createdAt: now,
      updatedAt: now,
    };
    updateRoadmap({ items: [...(roadmap?.items || []), newItem] });
    setSelectedItem(newItem);
    setShowItemDialog(true);
  };

  const updateItem = (itemId: string, updates: Partial<RoadmapItem>) => {
    const items = roadmap?.items?.map(item =>
      item.id === itemId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    updateRoadmap({ items });
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, ...updates });
    }
  };

  const deleteItem = (itemId: string) => {
    updateRoadmap({ items: roadmap?.items?.filter(i => i.id !== itemId) });
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
      setShowItemDialog(false);
    }
  };

  const moveItem = (itemId: string, newTimeframe: RoadmapTimeframe) => {
    updateItem(itemId, { timeframe: newTimeframe });
  };

  // Backlog management
  const addBacklogItem = (title: string) => {
    if (!title.trim()) return;
    const newItem: RoadmapBacklogItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      order: roadmap?.backlog?.length || 0,
      source: 'manual',
    };
    updateRoadmap({ backlog: [...(roadmap?.backlog || []), newItem] });
    setNewBacklogText("");
  };

  const moveBacklogToBoard = (backlogItem: RoadmapBacklogItem, swimlaneKey: string, timeframe: RoadmapTimeframe) => {
    const now = new Date().toISOString();
    const newItem: RoadmapItem = {
      id: crypto.randomUUID(),
      title: backlogItem.title,
      description: backlogItem.description,
      notes: backlogItem.notes,
      swimlaneKey,
      timeframe,
      order: 0,
      status: 'idea',
      size: backlogItem.suggestedSize,
      metrics: backlogItem.suggestedImpact ? { impact: backlogItem.suggestedImpact } : undefined,
      links: backlogItem.links,
      source: backlogItem.source,
      sourceContext: backlogItem.sourceContext,
      createdAt: now,
      updatedAt: now,
    };
    updateRoadmap({
      items: [...(roadmap?.items || []), newItem],
      backlog: roadmap?.backlog?.filter(b => b.id !== backlogItem.id),
    });
  };

  const deleteBacklogItem = (itemId: string) => {
    updateRoadmap({ backlog: roadmap?.backlog?.filter(b => b.id !== itemId) });
  };

  // Swimlane management
  const addSwimlane = (label: string, color: string = '#6366f1') => {
    const key = `custom_${crypto.randomUUID().slice(0, 8)}`;
    const newSwimlane: RoadmapSwimlane = {
      key,
      label,
      color,
      order: roadmap?.swimlanes?.length || 0,
      isCustom: true,
    };
    updateRoadmap({ swimlanes: [...(roadmap?.swimlanes || []), newSwimlane] });
    setExpandedSwimlanes(prev => new Set([...Array.from(prev), key]));
  };

  const deleteSwimlane = (key: string) => {
    // Move items to backlog before deleting swimlane
    const itemsToMove = roadmap?.items?.filter(i => i.swimlaneKey === key) || [];
    const newBacklog = itemsToMove.map(item => ({
      id: crypto.randomUUID(),
      title: item.title,
      description: item.description,
      notes: item.notes,
      suggestedTimeframe: item.timeframe,
      source: item.source,
      sourceContext: item.sourceContext,
      links: item.links,
      createdAt: new Date().toISOString(),
      order: (roadmap?.backlog?.length || 0),
    }));

    updateRoadmap({
      swimlanes: roadmap?.swimlanes?.filter(s => s.key !== key),
      items: roadmap?.items?.filter(i => i.swimlaneKey !== key),
      backlog: [...(roadmap?.backlog || []), ...newBacklog],
    });
  };

  const updateSwimlaneLabel = (key: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    const swimlanes = roadmap?.swimlanes?.map(s =>
      s.key === key ? { ...s, label: newLabel.trim() } : s
    );
    updateRoadmap({ swimlanes });
    setEditingSwimlaneKey(null);
    setEditingSwimlaneLabel("");
  };

  // Drag and drop handlers
  const handleDragStart = (item: RoadmapItem) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, swimlane: string, timeframe: RoadmapTimeframe) => {
    e.preventDefault();
    setDragOverCell({ swimlane, timeframe });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, swimlane: string, timeframe: RoadmapTimeframe) => {
    e.preventDefault();
    if (draggedItem) {
      updateItem(draggedItem.id, { swimlaneKey: swimlane, timeframe });
    }
    setDraggedItem(null);
    setDragOverCell(null);
  };

  // Quick add from AI
  const quickAddItem = (title: string, swimlaneKey?: string, timeframe?: RoadmapTimeframe) => {
    const now = new Date().toISOString();
    const targetSwimlane = swimlaneKey || roadmap?.swimlanes?.[0]?.key || 'features10x';
    const targetTimeframe = timeframe || 'later';

    const newItem: RoadmapItem = {
      id: crypto.randomUUID(),
      title,
      swimlaneKey: targetSwimlane,
      timeframe: targetTimeframe,
      order: 0,
      status: 'idea',
      source: 'ai',
      createdAt: now,
      updatedAt: now,
    };
    updateRoadmap({ items: [...(roadmap?.items || []), newItem] });
  };

  const quickAddBacklog = (title: string) => {
    const newItem: RoadmapBacklogItem = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      order: roadmap?.backlog?.length || 0,
      source: 'ai',
    };
    updateRoadmap({ backlog: [...(roadmap?.backlog || []), newItem] });
  };

  // Chat submit handler
  const handleChatSubmit = useCallback(async (
    message: string,
    options: {
      personaId?: string;
      sourceIds?: string[];
      attachments?: File[];
    }
  ) => {
    if (message === "/clear") {
      setMessages([]);
      localStorage.removeItem(chatStorageKey);
      return;
    }

    if (options.personaId && options.personaId !== selectedPersona) {
      setSelectedPersona(options.personaId);
    }

    let enhancedMessage = message;

    // Include source content
    if (options.sourceIds && options.sourceIds.length > 0) {
      for (const sourceId of options.sourceIds) {
        const source = sources.find(s => s.id === sourceId);
        if (source) {
          try {
            const res = await fetch(`/api/sources/${sourceId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                enhancedMessage += `\n\n--- Content from "${source.name}" ---\n${data.content.slice(0, 5000)}`;
              }
            }
          } catch (e) {
            console.error("Failed to fetch source:", e);
          }
        }
      }
    }

    // Handle attachments
    if (options.attachments && options.attachments.length > 0) {
      for (const file of options.attachments) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("clientId", roadmap?.clientId || "");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.content) {
              enhancedMessage += `\n\n--- Content from "${file.name}" ---\n${uploadData.content.slice(0, 5000)}`;
            }
          }
        } catch (e) {
          console.error("Upload error:", e);
        }
      }
    }

    append({ role: "user", content: enhancedMessage });
  }, [append, setMessages, selectedPersona, chatStorageKey, sources, roadmap?.clientId]);

  // Get items for a specific cell
  const getItemsForCell = (swimlaneKey: string, timeframe: RoadmapTimeframe) => {
    return roadmap?.items?.filter(i => i.swimlaneKey === swimlaneKey && i.timeframe === timeframe) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Roadmap not found</p>
        <Link href="/methods/roadmap">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmaps
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/methods/roadmap">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Map className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{roadmap.title}</h1>
                <Badge variant="outline" className={cn(
                  roadmap.status === "active" && "bg-green-500/20 text-green-500",
                  roadmap.status === "review" && "bg-purple-500/20 text-purple-500",
                  roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500"
                )}>
                  {roadmap.status}
                </Badge>
                {saving && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </Badge>
                )}
              </div>
              {roadmap.client && (
                <p className="text-muted-foreground">
                  {roadmap.client.name}
                  {roadmap.client.company && ` · ${roadmap.client.company}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="gap-1"
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </Button>
              <Button
                variant={viewMode === 'backlog' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('backlog')}
                className="gap-1"
              >
                <Package className="h-4 w-4" />
                Backlog
                {(roadmap.backlog?.length || 0) > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 px-1.5">
                    {roadmap.backlog?.length}
                  </Badge>
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className={cn(showChat && "bg-primary/10")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Asst.
            </Button>

            <Link href={`/roadmap/${params.id}/focus`}>
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Focus View
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  window.open(`/roadmap/${params.id}/focus`, 'roadmap-focus', 'width=1600,height=1000');
                }}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Open Focus View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  window.open(`/roadmap/${params.id}`, 'roadmap-share', 'width=1400,height=900');
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Client Share View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/methods/roadmap/${params.id}`);
                }}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  window.location.href = `/api/roadmaps/${params.id}/export?format=xlsx`;
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  window.location.href = `/api/roadmaps/${params.id}/export?format=csv`;
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Roadmap Overview
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingHeader(!editingHeader)}>
                {editingHeader ? "Done" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {editingHeader ? (
              <>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea
                    value={roadmap.objective || ""}
                    onChange={(e) => updateRoadmap({ objective: e.target.value })}
                    placeholder="What are we building towards?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vision</Label>
                  <Textarea
                    value={roadmap.vision || ""}
                    onChange={(e) => updateRoadmap({ vision: e.target.value })}
                    placeholder="The big picture..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Planning Horizon</Label>
                  <Input
                    value={roadmap.planningHorizon || ""}
                    onChange={(e) => updateRoadmap({ planningHorizon: e.target.value })}
                    placeholder="e.g., Q1 2026, Next 6 months"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={roadmap.status}
                    onValueChange={(v) => updateRoadmap({ status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
                  <p className="text-sm">{roadmap.objective || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vision</p>
                  <p className="text-sm">{roadmap.vision || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Planning Horizon</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {roadmap.planningHorizon || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stats</p>
                  <p className="text-sm">
                    {roadmap.items?.length || 0} items across {roadmap.swimlanes?.length || 0} lanes
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Board View */}
        {viewMode === 'board' && (
          <div className="space-y-4">
            {/* Timeframe Headers */}
            <div className="grid grid-cols-[200px_1fr_1fr_1fr_1fr] gap-2">
              <div className="font-medium text-sm text-muted-foreground">Swimlanes</div>
              {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => (
                <div key={tf} className="text-center">
                  <div className="font-medium" style={{ color: TIMEFRAME_CONFIG[tf].color }}>
                    {TIMEFRAME_CONFIG[tf].label}
                  </div>
                  <div className="text-xs text-muted-foreground">{TIMEFRAME_CONFIG[tf].sublabel}</div>
                </div>
              ))}
            </div>

            {/* Swimlane Rows */}
            {roadmap.swimlanes?.map((swimlane) => (
              <div key={swimlane.key} className="space-y-2">
                {/* Swimlane Header */}
                <div className="flex items-center gap-2 group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setExpandedSwimlanes(prev => {
                        const next = new Set(prev);
                        next.has(swimlane.key) ? next.delete(swimlane.key) : next.add(swimlane.key);
                        return next;
                      });
                    }}
                  >
                    {expandedSwimlanes.has(swimlane.key) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: swimlane.color }}
                  />
                  {editingSwimlaneKey === swimlane.key ? (
                    <Input
                      value={editingSwimlaneLabel}
                      onChange={(e) => setEditingSwimlaneLabel(e.target.value)}
                      onBlur={() => updateSwimlaneLabel(swimlane.key, editingSwimlaneLabel)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateSwimlaneLabel(swimlane.key, editingSwimlaneLabel);
                        } else if (e.key === "Escape") {
                          setEditingSwimlaneKey(null);
                          setEditingSwimlaneLabel("");
                        }
                      }}
                      className="h-6 w-32 text-sm font-medium"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="font-medium text-sm cursor-pointer hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSwimlaneKey(swimlane.key);
                        setEditingSwimlaneLabel(swimlane.label);
                      }}
                      title="Click to edit"
                    >
                      {swimlane.label}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {roadmap.items?.filter(i => i.swimlaneKey === swimlane.key).length || 0}
                  </Badge>
                  {swimlane.isCustom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => deleteSwimlane(swimlane.key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Swimlane Grid */}
                {expandedSwimlanes.has(swimlane.key) && (
                  <div className="grid grid-cols-[200px_1fr_1fr_1fr_1fr] gap-2">
                    <div /> {/* Empty cell for alignment */}
                    {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => {
                      const items = getItemsForCell(swimlane.key, tf);
                      const isDropTarget = dragOverCell?.swimlane === swimlane.key && dragOverCell?.timeframe === tf;
                      return (
                        <div
                          key={`${swimlane.key}-${tf}`}
                          className={cn(
                            "min-h-[100px] rounded-lg border border-dashed p-2 space-y-2 transition-colors",
                            isDropTarget
                              ? "border-primary bg-primary/10 border-solid"
                              : "border-muted-foreground/30 bg-muted/20"
                          )}
                          onDragOver={(e) => handleDragOver(e, swimlane.key, tf)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, swimlane.key, tf)}
                        >
                          {items.map((item) => (
                            <RoadmapItemCard
                              key={item.id}
                              item={item}
                              onSelect={() => {
                                setSelectedItem(item);
                                setShowItemDialog(true);
                              }}
                              onMove={moveItem}
                              onDragStart={() => handleDragStart(item)}
                              onDragEnd={handleDragEnd}
                              isDragging={draggedItem?.id === item.id}
                              tags={roadmap?.tags}
                            />
                          ))}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-muted-foreground hover:text-foreground border-dashed border"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                              <DropdownMenuItem onClick={() => addItem(swimlane.key, tf)}>
                                <Target className="h-4 w-4 mr-2" />
                                Add to Board
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const now = new Date().toISOString();
                                const newItem: RoadmapBacklogItem = {
                                  id: crypto.randomUUID(),
                                  title: "New Item",
                                  suggestedSwimlane: swimlane.key,
                                  suggestedTimeframe: tf,
                                  createdAt: now,
                                  order: roadmap?.backlog?.length || 0,
                                  source: 'manual',
                                };
                                updateRoadmap({ backlog: [...(roadmap?.backlog || []), newItem] });
                                setViewMode('backlog');
                              }}>
                                <Package className="h-4 w-4 mr-2" />
                                Add to Backlog
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Add Swimlane */}
            <div className="flex items-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSwimlane("New Lane")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Swimlane
              </Button>
            </div>
          </div>
        )}

        {/* Backlog View */}
        {viewMode === 'backlog' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-500" />
                Backlog / Dump Zone
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dump ideas here, sort them later. Drag to the board when ready.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Add */}
              <div className="flex gap-2">
                <Input
                  value={newBacklogText}
                  onChange={(e) => setNewBacklogText(e.target.value)}
                  placeholder="Quick add: Type and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBacklogText.trim()) {
                      addBacklogItem(newBacklogText);
                    }
                  }}
                />
                <Button onClick={() => addBacklogItem(newBacklogText)} disabled={!newBacklogText.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Backlog Items */}
              <div className="space-y-2">
                {roadmap.backlog?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No items in backlog</p>
                    <p className="text-xs mt-1">Add ideas here to sort later</p>
                  </div>
                ) : (
                  roadmap.backlog?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:border-primary/50 group"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            💡 {item.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {item.suggestedSwimlane && (
                            <Badge variant="outline" className="text-xs">
                              → {item.suggestedSwimlane}
                            </Badge>
                          )}
                          {item.suggestedTimeframe && (
                            <Badge variant="outline" className="text-xs">
                              {item.suggestedTimeframe}
                            </Badge>
                          )}
                          {item.source === 'ai' && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500">
                              AI suggested
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoveRight className="h-4 w-4 mr-1" />
                              Move to Board
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            {roadmap.swimlanes?.map((lane) => (
                              <DropdownMenuItem
                                key={lane.key}
                                onClick={() => moveBacklogToBoard(item, lane.key, 'later')}
                              >
                                <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: lane.color }} />
                                {lane.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteBacklogItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-500" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={roadmap.notes || ""}
              onChange={(e) => updateRoadmap({ notes: e.target.value })}
              placeholder="General notes, context, things to remember..."
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* Item Detail Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: STATUS_CONFIG[selectedItem.status].color }}
                  />
                  Edit Item
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={selectedItem.title}
                    onChange={(e) => updateItem(selectedItem.id, { title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedItem.description || ""}
                    onChange={(e) => updateItem(selectedItem.id, { description: e.target.value })}
                    placeholder="What is this item about?"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedItem.status}
                      onValueChange={(v) => updateItem(selectedItem.id, { status: v as RoadmapItemStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Size (T-Shirt)</Label>
                    <Select
                      value={selectedItem.size || ""}
                      onValueChange={(v) => updateItem(selectedItem.id, { size: v as RoadmapItemSize })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SIZE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label} ({config.description})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Impact</Label>
                    <Select
                      value={selectedItem.metrics?.impact || ""}
                      onValueChange={(v) => updateItem(selectedItem.id, {
                        metrics: { ...selectedItem.metrics, impact: v as RoadmapItemImpact }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select impact" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(IMPACT_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timeframe</Label>
                    <Select
                      value={selectedItem.timeframe}
                      onValueChange={(v) => updateItem(selectedItem.id, { timeframe: v as RoadmapTimeframe })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIMEFRAME_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label} ({config.sublabel})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Why are we doing this?</Label>
                  <Textarea
                    value={selectedItem.why || ""}
                    onChange={(e) => updateItem(selectedItem.id, { why: e.target.value })}
                    placeholder="The rationale behind this item..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Success Criteria</Label>
                  <Textarea
                    value={selectedItem.successCriteria || ""}
                    onChange={(e) => updateItem(selectedItem.id, { successCriteria: e.target.value })}
                    placeholder="How do we know this worked?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={selectedItem.notes || ""}
                    onChange={(e) => updateItem(selectedItem.id, { notes: e.target.value })}
                    placeholder="Additional context, hints..."
                    rows={2}
                  />
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagInput
                    itemTags={selectedItem.tags || []}
                    allTags={roadmap?.tags || []}
                    onTagsChange={(tags) => updateItem(selectedItem.id, { tags })}
                    onCreateTag={(name, color) => {
                      const newTag: RoadmapTag = {
                        id: crypto.randomUUID(),
                        name,
                        color,
                      };
                      updateRoadmap({ tags: [...(roadmap?.tags || []), newTag] });
                      return newTag.id;
                    }}
                  />
                </div>

                {/* Subtasks Section */}
                <div className="space-y-2">
                  <Label>Subtasks</Label>
                  <SubtaskList
                    subtasks={selectedItem.subtasks || []}
                    onSubtasksChange={(subtasks) => updateItem(selectedItem.id, { subtasks })}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => deleteItem(selectedItem.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button onClick={() => setShowItemDialog(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Chat Sidebar */}
      {showChat && (
        <div className="w-96 border-l bg-muted/30 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Assistant
            </h3>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setMessages([]);
                    localStorage.removeItem(chatStorageKey);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Ask me anything about this roadmap.</p>
                <p className="mt-2">I can help you:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Process a document into roadmap items</li>
                  <li>• Suggest items for swimlanes</li>
                  <li>• Brainstorm features and priorities</li>
                  <li>• Organize backlog items</li>
                </ul>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start text-xs"
                    onClick={() => append({
                      role: "user",
                      content: "Help me brainstorm features for this roadmap. What are some common areas I should consider?"
                    })}
                  >
                    💡 Brainstorm feature areas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start text-xs"
                    onClick={() => append({
                      role: "user",
                      content: "I want to add a new item to the roadmap. Ask me questions to help define it properly."
                    })}
                  >
                    ➕ Add new item (guided)
                  </Button>
                </div>
              </div>
            )}

            {messages.map((m) => {
              // Parse suggestions from AI
              const suggestions: { type: string; title: string; swimlane?: string; timeframe?: string }[] = [];

              if (m.role === "assistant") {
                // ADD ITEM patterns
                const itemMatches = Array.from(m.content.matchAll(/🗂️\s*ADD ITEM:\s*["']?([^"'\n]+)["']?/gi));
                for (const match of itemMatches) {
                  suggestions.push({ type: "item", title: match[1].trim() });
                }

                // BACKLOG patterns
                const backlogMatches = Array.from(m.content.matchAll(/📦\s*BACKLOG:\s*["']?([^"'\n]+)["']?/gi));
                for (const match of backlogMatches) {
                  suggestions.push({ type: "backlog", title: match[1].trim() });
                }

                // Bulk items
                const bulkMatches = Array.from(m.content.matchAll(/(?:📋|🗒️)\s*ITEMS:\s*\n?((?:[-•*]\s*.+\n?)+)/gi));
                for (const match of bulkMatches) {
                  const items = match[1].split('\n')
                    .map(line => line.replace(/^[-•*]\s*/, '').trim())
                    .filter(line => line.length > 0);
                  items.forEach(item => {
                    suggestions.push({ type: "backlog", title: item });
                  });
                }
              }

              return (
                <div key={m.id} className="space-y-2">
                  <div
                    className={cn(
                      "rounded-lg p-3 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    )}
                  >
                    {m.content}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {suggestions.slice(0, 8).map((s, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                          onClick={() => {
                            if (s.type === "item") {
                              quickAddItem(s.title);
                            } else {
                              quickAddBacklog(s.title);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          {s.type === "item" ? "Add" : "+Backlog"}
                        </Button>
                      ))}
                      {suggestions.length > 8 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{suggestions.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t">
            <ChatComposer
              onSubmit={handleChatSubmit}
              personas={personas}
              sources={sources}
              selectedPersona={selectedPersona}
              onPersonaChange={setSelectedPersona}
              isLoading={chatLoading}
              placeholder="Describe features, paste docs, ask questions..."
              compact={false}
              showAttachments={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Roadmap Item Card Component
function RoadmapItemCard({
  item,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
  isDragging,
  tags,
}: {
  item: RoadmapItem;
  onSelect: () => void;
  onMove: (itemId: string, timeframe: RoadmapTimeframe) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  tags?: RoadmapTag[];
}) {
  const statusConfig = STATUS_CONFIG[item.status];
  const itemTags = tags?.filter(t => item.tags?.includes(t.id)) || [];
  const subtasksDone = item.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = item.subtasks?.length || 0;

  return (
    <div
      className={cn(
        "p-2 bg-background border rounded-lg cursor-grab hover:border-primary/50 hover:shadow-sm transition-all group",
        isDragging && "opacity-50 cursor-grabbing"
      )}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
        <div
          className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: statusConfig.color }}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {/* Tags */}
          {itemTags.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {itemTags.map(tag => (
                <span
                  key={tag.id}
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {item.size && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {SIZE_CONFIG[item.size].label}
              </Badge>
            )}
            {item.metrics?.impact && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1"
                style={{
                  backgroundColor: `${IMPACT_CONFIG[item.metrics.impact].color}20`,
                  color: IMPACT_CONFIG[item.metrics.impact].color,
                  borderColor: `${IMPACT_CONFIG[item.metrics.impact].color}50`
                }}
              >
                {IMPACT_CONFIG[item.metrics.impact].label}
              </Badge>
            )}
            {subtasksTotal > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {subtasksDone}/{subtasksTotal}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 break-all">
              💡 {item.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Tag Input Component with autocomplete
function TagInput({
  itemTags,
  allTags,
  onTagsChange,
  onCreateTag,
}: {
  itemTags: string[];
  allTags: RoadmapTag[];
  onTagsChange: (tags: string[]) => void;
  onCreateTag: (name: string, color: string) => string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const currentTags = allTags.filter(t => itemTags.includes(t.id));
  const availableTags = allTags.filter(t => !itemTags.includes(t.id));
  const filteredSuggestions = availableTags.filter(t =>
    t.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  const isNewTag = inputValue.trim() && !allTags.some(t =>
    t.name.toLowerCase() === inputValue.toLowerCase()
  );

  const addTag = (tagId: string) => {
    onTagsChange([...itemTags, tagId]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagId: string) => {
    onTagsChange(itemTags.filter(id => id !== tagId));
  };

  const createAndAddTag = () => {
    if (!inputValue.trim()) return;
    const color = TAG_COLORS[selectedColorIndex];
    const tagId = onCreateTag(inputValue.trim(), color);
    onTagsChange([...itemTags, tagId]);
    setInputValue("");
    setShowSuggestions(false);
    setSelectedColorIndex((selectedColorIndex + 1) % TAG_COLORS.length);
  };

  return (
    <div className="space-y-2">
      {/* Current tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {currentTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isNewTag) {
              e.preventDefault();
              createAndAddTag();
            }
          }}
          placeholder="Add tag..."
          className="h-8"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && (inputValue || availableTags.length > 0) && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
            {filteredSuggestions.map(tag => (
              <button
                key={tag.id}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => addTag(tag.id)}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
            {isNewTag && (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 border-t"
                onClick={createAndAddTag}
              >
                <Plus className="h-3 w-3" />
                Create &quot;{inputValue}&quot;
                <span
                  className="h-3 w-3 rounded-full ml-auto"
                  style={{ backgroundColor: TAG_COLORS[selectedColorIndex] }}
                />
              </button>
            )}
            {!isNewTag && filteredSuggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matching tags
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Subtask List Component
function SubtaskList({
  subtasks,
  onSubtasksChange,
}: {
  subtasks: RoadmapSubtask[];
  onSubtasksChange: (subtasks: RoadmapSubtask[]) => void;
}) {
  const [newSubtask, setNewSubtask] = useState("");

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const subtask: RoadmapSubtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      done: false,
    };
    onSubtasksChange([...subtasks, subtask]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: string) => {
    onSubtasksChange(
      subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s)
    );
  };

  const deleteSubtask = (id: string) => {
    onSubtasksChange(subtasks.filter(s => s.id !== id));
  };

  const doneCount = subtasks.filter(s => s.done).length;

  return (
    <div className="space-y-2">
      {/* Progress */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(doneCount / subtasks.length) * 100}%` }}
            />
          </div>
          <span>{doneCount}/{subtasks.length}</span>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks.map(subtask => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 group"
          >
            <button
              onClick={() => toggleSubtask(subtask.id)}
              className={cn(
                "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                subtask.done
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-muted-foreground/30 hover:border-primary"
              )}
            >
              {subtask.done && <CheckCircle2 className="h-3 w-3" />}
            </button>
            <span className={cn(
              "flex-1 text-sm",
              subtask.done && "line-through text-muted-foreground"
            )}>
              {subtask.title}
            </span>
            <button
              onClick={() => deleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      <div className="flex gap-2">
        <Input
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubtask();
            }
          }}
          placeholder="Add subtask..."
          className="h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addSubtask}
          disabled={!newSubtask.trim()}
          className="h-8"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
