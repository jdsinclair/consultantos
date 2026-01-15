"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Lock,
  Unlock,
  AlertTriangle,
  Lightbulb,
  Eye,
  EyeOff,
  Save,
  Loader2,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Target,
  Crosshair,
  Gauge,
  Expand,
  Filter,
  Skull,
  Shield,
  FileText,
  Layers,
  X,
  Sparkles,
  Send,
  ExternalLink,
  Copy,
  Check,
  Plus,
  HelpCircle,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import {
  ClarityCanvas,
  ClarityStrategicTruth,
  ClarityNorthStar,
  ClarityCoreEngine,
  ClaritySwimlanes,
  STRATEGIC_TRUTH_CONFIG,
  CORE_ENGINE_CONFIG,
  SWIMLANE_LABELS,
  SWIMLANE_QUESTION,
  SWIMLANE_GUIDANCE,
  SWIMLANE_TIMEFRAME_LABELS,
  EMPTY_SWIMLANE,
  DEFAULT_CANVAS,
  ClarityBox,
} from "@/lib/clarity-method/types";
import { useChat } from "ai/react";

type ViewMode = "founder" | "coach";
type ActiveSection = 
  | "truth" 
  | "northstar" 
  | "engine" 
  | "expansion" 
  | "serviceproduct" 
  | "kill" 
  | "paranoia" 
  | "strategy" 
  | "swimlanes";

interface Client {
  id: string;
  name: string;
  company?: string;
}

export default function ClarityMethodPage({ params }: { params: { clientId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvas, setCanvas] = useState<ClarityCanvas | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("coach");
  const [activeSection, setActiveSection] = useState<ActiveSection>("truth");
  const [showAIChat, setShowAIChat] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["truth"]));
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showGuidance, setShowGuidance] = useState<string | null>(null);
  const [newSwimlaneLabel, setNewSwimlaneLabel] = useState("");
  const [showAddSwimlane, setShowAddSwimlane] = useState(false);

  // AI Chat integration
  const { messages, input, handleInputChange, handleSubmit, isLoading: aiLoading, setMessages } = useChat({
    api: "/api/chat",
    body: {
      clientId: params.clientId,
      context: "clarity-method",
      canvas: canvas,
    },
    initialMessages: [
      {
        id: "system",
        role: "assistant",
        content: `I'm your AI Strategy Assistant for the Clarity Method. I can help you:

• Pressure-test strategic positioning
• Identify the real constraint
• Challenge generic or vague answers
• Suggest execution priorities based on the canvas

Ask me anything about ${client?.name}'s strategy.`,
      },
    ],
  });

  // Open founder view in new window (no navigation popup)
  const openFounderWindow = () => {
    const url = `/clarity/${params.clientId}`; // Uses (share) route group - no nav
    window.open(url, 'FounderView', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    fetchCanvas();
  }, [params.clientId]);

  const fetchCanvas = async () => {
    try {
      const res = await fetch(`/api/clarity-method/${params.clientId}`);
      if (!res.ok) throw new Error("Failed to fetch canvas");
      const data = await res.json();
      setCanvas(data.canvas);
      setClient(data.client);
    } catch (error) {
      console.error("Error fetching canvas:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCanvas = useCallback(async (updates: Partial<ClarityCanvas>) => {
    if (!canvas) return;
    
    // Optimistic update
    setCanvas({ ...canvas, ...updates });
    setHasChanges(true);
  }, [canvas]);

  const saveCanvas = async () => {
    if (!canvas || !hasChanges) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clarity-method/${params.clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canvas),
      });
      if (!res.ok) throw new Error("Failed to save");
      setHasChanges(false);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateStrategicTruth = (key: keyof ClarityStrategicTruth, value: string) => {
    if (!canvas?.strategicTruth) return;
    updateCanvas({
      strategicTruth: {
        ...canvas.strategicTruth,
        [key]: { ...canvas.strategicTruth[key], value },
      },
    });
  };

  const lockStrategicTruth = (key: keyof ClarityStrategicTruth) => {
    if (!canvas?.strategicTruth) return;
    updateCanvas({
      strategicTruth: {
        ...canvas.strategicTruth,
        [key]: {
          ...canvas.strategicTruth[key],
          status: 'locked',
          lockedAt: new Date().toISOString(),
        },
      },
    });
  };

  const unlockStrategicTruth = (key: keyof ClarityStrategicTruth) => {
    if (!canvas?.strategicTruth) return;
    updateCanvas({
      strategicTruth: {
        ...canvas.strategicTruth,
        [key]: {
          ...canvas.strategicTruth[key],
          status: 'draft',
          lockedAt: undefined,
        },
      },
    });
  };

  const updateCoreEngine = (key: keyof ClarityCoreEngine, value: string) => {
    if (!canvas?.coreEngine) return;
    if (key === 'primaryConstraint') {
      updateCanvas({
        coreEngine: { ...canvas.coreEngine, primaryConstraint: value },
      });
    } else {
      updateCanvas({
        coreEngine: {
          ...canvas.coreEngine,
          [key]: { ...canvas.coreEngine[key], answer: value },
        },
      });
    }
  };

  const addCustomSwimlane = () => {
    if (!newSwimlaneLabel.trim() || !canvas?.swimlanes) return;
    const id = `custom_${Date.now()}`;
    updateCanvas({
      swimlanes: {
        ...canvas.swimlanes,
        [id]: {
          label: newSwimlaneLabel.trim(),
          short: { objective: '', items: [] },
          mid: { objective: '', items: [] },
          long: { objective: '', items: [] },
        },
      } as any,
    });
    setNewSwimlaneLabel("");
    setShowAddSwimlane(false);
  };

  const removeCustomSwimlane = (key: string) => {
    if (!canvas?.swimlanes) return;
    const { [key]: removed, ...rest } = canvas.swimlanes as any;
    updateCanvas({ swimlanes: rest as ClaritySwimlanes });
  };

  // Helper to get swimlane items (handles both new and legacy format)
  const getSwimlaneItems = (lane: any, timeframe: 'short' | 'mid' | 'long'): string[] => {
    if (!lane?.[timeframe]) return [];
    if (Array.isArray(lane[timeframe])) return lane[timeframe];
    return lane[timeframe]?.items || [];
  };

  const getSwimlaneObjective = (lane: any, timeframe: 'short' | 'mid' | 'long'): string => {
    if (!lane?.[timeframe]) return '';
    if (Array.isArray(lane[timeframe])) return '';
    return lane[timeframe]?.objective || '';
  };

  const updateSwimlaneItems = (key: string, timeframe: 'short' | 'mid' | 'long', items: string[]) => {
    if (!canvas?.swimlanes) return;
    const lane = (canvas.swimlanes as any)[key];
    const currentObjective = getSwimlaneObjective(lane, timeframe);
    updateCanvas({
      swimlanes: {
        ...canvas.swimlanes,
        [key]: {
          ...lane,
          [timeframe]: { objective: currentObjective, items },
        },
      } as any,
    });
  };

  const updateSwimlaneObjective = (key: string, timeframe: 'short' | 'mid' | 'long', objective: string) => {
    if (!canvas?.swimlanes) return;
    const lane = (canvas.swimlanes as any)[key];
    const currentItems = getSwimlaneItems(lane, timeframe);
    updateCanvas({
      swimlanes: {
        ...canvas.swimlanes,
        [key]: {
          ...lane,
          [timeframe]: { objective, items: currentItems },
        },
      } as any,
    });
  };

  // Create a "Do The Thing" plan from a swimlane item
  const createPlanFromSwimlane = async (
    swimlaneKey: string, 
    timeframe: 'short' | 'mid' | 'long',
    item: string
  ) => {
    try {
      const timeframeLabels = { short: '30 days', mid: '90 days', long: '12 months' };
      const res = await fetch('/api/execution-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: params.clientId,
          title: item,
          objective: item,
          timeframe: timeframeLabels[timeframe],
          sourceSwimlanelKey: swimlaneKey,
          sourceTimeframe: timeframe,
          sourceClarityCanvasId: canvas?.id,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create plan');
      const plan = await res.json();
      router.push(`/methods/do-the-thing/${plan.id}`);
    } catch (e) {
      console.error('Failed to create plan:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canvas || !client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Canvas not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/clients/${params.clientId}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  Clarity Method™
                  <Badge variant="outline" className="font-normal">
                    {client.name}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Strategic Diagnosis + Execution Mapping
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Founder Popup - for screen sharing */}
              <Button
                variant="outline"
                size="sm"
                onClick={openFounderWindow}
                className="gap-2"
                title="Open founder view in new window (for screen sharing)"
              >
                <ExternalLink className="h-4 w-4" />
                Share View
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 bg-muted/30">
                <span className={viewMode === "founder" ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Founder
                </span>
                <Switch
                  checked={viewMode === "coach"}
                  onCheckedChange={(checked) => setViewMode(checked ? "coach" : "founder")}
                />
                <span className={viewMode === "coach" ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Coach
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIChat(!showAIChat)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                AI Assist
              </Button>

              <Button
                onClick={saveCanvas}
                disabled={saving || !hasChanges}
                size="sm"
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {hasChanges ? "Save" : "Saved"}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Content */}
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          {/* Section 0: Strategic Truth Header */}
          <Card className={expandedSections.has("truth") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("truth")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Strategic Truth Header</CardTitle>
                    <CardDescription>6 boxes. 6 questions. No debate.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canvas.strategicTruth && Object.values(canvas.strategicTruth).filter(b => b.status === 'locked').length > 0 && (
                    <Badge variant="secondary">
                      {Object.values(canvas.strategicTruth).filter(b => b.status === 'locked').length}/6 locked
                    </Badge>
                  )}
                  {expandedSections.has("truth") ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedSections.has("truth") && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(STRATEGIC_TRUTH_CONFIG) as (keyof typeof STRATEGIC_TRUTH_CONFIG)[]).map((key) => {
                    const config = STRATEGIC_TRUTH_CONFIG[key];
                    const box = canvas.strategicTruth?.[key];
                    const isLocked = box?.status === 'locked';

                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-lg border ${
                          isLocked ? "bg-muted/50 border-green-500/30" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{config.question}</h4>
                            {viewMode === "coach" && (
                              <p className="text-xs text-muted-foreground">{config.why}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => isLocked ? unlockStrategicTruth(key) : lockStrategicTruth(key)}
                            disabled={!isLocked && !box?.value}
                            title={isLocked ? "Click to unlock and edit" : "Lock this answer"}
                          >
                            {isLocked ? (
                              <Lock className="h-3 w-3 text-green-500" />
                            ) : (
                              <Unlock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        <Textarea
                          value={box?.value || ""}
                          onChange={(e) => updateStrategicTruth(key, e.target.value)}
                          placeholder={viewMode === "coach" ? config.prompt : ""}
                          className="min-h-[80px] text-sm"
                          disabled={isLocked}
                        />
                        {viewMode === "coach" && !isLocked && (
                          <div className="mt-3 space-y-2 text-xs">
                            {/* How to Think About This */}
                            {'howToThink' in config && (
                              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                <p className="font-medium text-blue-400 mb-1">💭 How to think about this:</p>
                                <p className="text-blue-400/80">{(config as any).howToThink}</p>
                              </div>
                            )}
                            {/* Script to Use */}
                            {'script' in config && (
                              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-purple-400 mb-1">🎯 Script to use:</p>
                                    <p className="text-purple-400/80 italic">&ldquo;{(config as any).script}&rdquo;</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard((config as any).script);
                                    }}
                                    title="Copy script"
                                  >
                                    {copiedText === (config as any).script ? (
                                      <Check className="h-3 w-3 text-purple-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {/* Red Flags */}
                            {'redFlags' in config && (
                              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                <p className="font-medium text-amber-400 mb-1">🚩 Red flags to watch for:</p>
                                {((config as any).redFlags as string[]).map((flag, i) => (
                                  <p key={i} className="text-amber-400/80">• {flag}</p>
                                ))}
                              </div>
                            )}
                            {/* Bad Answers */}
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="font-medium text-red-400 mb-1">❌ Bad answers:</p>
                              {config.badAnswers.map((bad, i) => (
                                <p key={i} className="text-red-400/80">• {bad}</p>
                              ))}
                            </div>
                            {/* Good Example */}
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-green-400 mb-1">✓ Good example:</p>
                                  <p className="text-green-400/80">{config.goodExamples[0]}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(config.goodExamples[0]);
                                  }}
                                  title="Copy example"
                                >
                                  {copiedText === config.goodExamples[0] ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 1: North Star */}
          <Card className={expandedSections.has("northstar") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("northstar")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Crosshair className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">North Star</CardTitle>
                    <CardDescription>Constraints, not vision. Guardrails.</CardDescription>
                  </div>
                </div>
                {expandedSections.has("northstar") ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has("northstar") && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Revenue Target</label>
                    <Input
                      value={canvas.northStar?.revenueTarget || ""}
                      onChange={(e) => updateCanvas({
                        northStar: { ...canvas.northStar!, revenueTarget: e.target.value }
                      })}
                      placeholder="e.g., $3.1M (25) / $5m (26)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Margin Floor</label>
                    <Input
                      value={canvas.northStar?.marginFloor || ""}
                      onChange={(e) => updateCanvas({
                        northStar: { ...canvas.northStar!, marginFloor: e.target.value }
                      })}
                      placeholder="e.g., > 20% Org Margin + 36.6% Ops Margin"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Founder Role (What They STOP Doing)</label>
                    <Input
                      value={canvas.northStar?.founderRole || ""}
                      onChange={(e) => updateCanvas({
                        northStar: { ...canvas.northStar!, founderRole: e.target.value }
                      })}
                      placeholder="e.g., Stand down from founder-led sales"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complexity Ceiling</label>
                    <Input
                      value={canvas.northStar?.complexityCeiling || ""}
                      onChange={(e) => updateCanvas({
                        northStar: { ...canvas.northStar!, complexityCeiling: e.target.value }
                      })}
                      placeholder="What level of complexity will you not exceed?"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 2: Core Engine */}
          <Card className={expandedSections.has("engine") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("engine")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Gauge className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Core Engine (Reality)</CardTitle>
                    <CardDescription>Pure diagnosis. No solutions allowed yet.</CardDescription>
                  </div>
                </div>
                {expandedSections.has("engine") ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has("engine") && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(Object.keys(CORE_ENGINE_CONFIG) as (keyof typeof CORE_ENGINE_CONFIG)[]).map((key) => {
                    const config = CORE_ENGINE_CONFIG[key];
                    const answer = canvas.coreEngine?.[key];
                    const value = typeof answer === 'string' ? answer : answer?.answer || '';
                    const warning = typeof answer === 'object' ? answer?.warning : undefined;
                    const isShowingEngineGuidance = showGuidance === `engine_${key}`;

                    return (
                      <div key={key} className="space-y-2 p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-sm font-medium">{config.question}</label>
                          <div className="flex items-center gap-2">
                            {viewMode === "coach" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setShowGuidance(isShowingEngineGuidance ? null : `engine_${key}`)}
                              >
                                <HelpCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {config.warning}
                            </span>
                          </div>
                        </div>
                        {viewMode === "coach" && isShowingEngineGuidance && (
                          <div className="space-y-2 text-xs">
                            {'howToThink' in config && (
                              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                <p className="font-medium text-blue-400 mb-1">💭 How to think:</p>
                                <p className="text-blue-400/80">{(config as any).howToThink}</p>
                              </div>
                            )}
                            {'script' in config && (
                              <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-purple-400 mb-1">🎯 Ask this:</p>
                                    <p className="text-purple-400/80 italic">&ldquo;{(config as any).script}&rdquo;</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={() => copyToClipboard((config as any).script)}
                                  >
                                    {copiedText === (config as any).script ? (
                                      <Check className="h-3 w-3 text-purple-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {'warningThreshold' in config && (
                              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                <p className="font-medium text-amber-400">⚠️ {(config as any).warningThreshold}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <Textarea
                          value={value}
                          onChange={(e) => updateCoreEngine(key, e.target.value)}
                          placeholder={viewMode === "coach" ? config.prompts[0] : ""}
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Primary Constraint */}
                <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">Primary Constraint (ONE)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on the above, what is THE constraint? One sentence only.
                  </p>
                  <Textarea
                    value={canvas.coreEngine?.primaryConstraint || ""}
                    onChange={(e) => updateCoreEngine('primaryConstraint', e.target.value)}
                    placeholder="The primary constraint is..."
                    className="min-h-[60px] bg-background"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 8: Execution Swimlanes */}
          <Card className={expandedSections.has("swimlanes") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("swimlanes")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Execution Swimlanes</CardTitle>
                    <CardDescription>Time-phased execution with objectives: Short / Mid / Long</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.has("swimlanes") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddSwimlane(true);
                      }}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Swimlane
                    </Button>
                  )}
                  {expandedSections.has("swimlanes") ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedSections.has("swimlanes") && (
              <CardContent>
                {viewMode === "coach" && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <strong>Per swimlane:</strong> Set an <span className="text-primary font-semibold">objective</span> for each timeframe, then max 3 action items.
                    <br />
                    <span className="text-muted-foreground">Click the <HelpCircle className="h-3 w-3 inline" /> icon for guidance on each area.</span>
                  </div>
                )}

                {/* Add Swimlane Modal */}
                {showAddSwimlane && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium mb-2">Add Custom Swimlane</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newSwimlaneLabel}
                        onChange={(e) => setNewSwimlaneLabel(e.target.value)}
                        placeholder="e.g., Content Strategy"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && addCustomSwimlane()}
                      />
                      <Button onClick={addCustomSwimlane} disabled={!newSwimlaneLabel.trim()}>Add</Button>
                      <Button variant="ghost" onClick={() => setShowAddSwimlane(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium w-48">Area</th>
                        <th className="text-left p-2 font-medium">
                          <div>{SWIMLANE_TIMEFRAME_LABELS.short}</div>
                        </th>
                        <th className="text-left p-2 font-medium">
                          <div>{SWIMLANE_TIMEFRAME_LABELS.mid}</div>
                        </th>
                        <th className="text-left p-2 font-medium">
                          <div>{SWIMLANE_TIMEFRAME_LABELS.long}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(SWIMLANE_LABELS) as (keyof typeof SWIMLANE_LABELS)[]).map((key) => {
                        const guidance = SWIMLANE_GUIDANCE[key];
                        const isShowingGuidance = showGuidance === key;

                        return (
                          <tr key={key} className="border-b group">
                            <td className="p-2 font-medium text-muted-foreground whitespace-nowrap align-top">
                              <div className="flex items-center gap-1">
                                {SWIMLANE_LABELS[key]}
                                {viewMode === "coach" && guidance && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-50 hover:opacity-100"
                                    onClick={() => setShowGuidance(isShowingGuidance ? null : key)}
                                  >
                                    <HelpCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {isShowingGuidance && guidance && (
                                <div className="mt-2 p-2 bg-primary/5 rounded text-xs space-y-2 max-w-xs">
                                  <p className="font-medium text-primary">{guidance.why}</p>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Questions:</p>
                                    {guidance.questions.map((q, i) => (
                                      <p key={i} className="text-muted-foreground">• {q}</p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-medium text-green-500">Example actions:</p>
                                    {guidance.examples.map((ex, i) => (
                                      <div key={i} className="flex items-center gap-1 text-green-500/80">
                                        <span>• {ex}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4"
                                          onClick={() => copyToClipboard(ex)}
                                        >
                                          {copiedText === ex ? <Check className="h-2 w-2" /> : <Copy className="h-2 w-2" />}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            {(['short', 'mid', 'long'] as const).map((timeframe) => {
                              const items = getSwimlaneItems((canvas.swimlanes as any)?.[key], timeframe);
                              const objective = getSwimlaneObjective((canvas.swimlanes as any)?.[key], timeframe);
                              return (
                                <td key={timeframe} className="p-2 align-top group/cell">
                                  <div className="flex items-center gap-1 mb-2">
                                    <Input
                                      value={objective}
                                      onChange={(e) => updateSwimlaneObjective(key, timeframe, e.target.value)}
                                      placeholder="Objective..."
                                      className="text-xs font-medium border-primary/30 focus:border-primary"
                                    />
                                    {objective && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover/cell:opacity-100 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500"
                                        onClick={() => createPlanFromSwimlane(key, timeframe, objective)}
                                        title="Do The Thing™ - Create execution plan"
                                      >
                                        <Rocket className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <Textarea
                                    value={items.join('\n')}
                                    onChange={(e) => {
                                      const lines = e.target.value.split('\n').filter(l => l.trim()).slice(0, 5);
                                      updateSwimlaneItems(key, timeframe, lines);
                                    }}
                                    placeholder="• Action 1&#10;• Action 2&#10;• Action 3"
                                    className="min-h-[60px] text-xs"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* Custom Swimlanes */}
                      {Object.entries(canvas.swimlanes || {})
                        .filter(([k]) => k.startsWith('custom_'))
                        .map(([key, lane]) => {
                          const customLane = lane as any;
                          return (
                            <tr key={key} className="border-b bg-muted/20">
                              <td className="p-2 font-medium text-muted-foreground whitespace-nowrap align-top">
                                <div className="flex items-center gap-1">
                                  {customLane.label || key.replace('custom_', '')}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-red-500 opacity-50 hover:opacity-100"
                                    onClick={() => removeCustomSwimlane(key)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              {(['short', 'mid', 'long'] as const).map((timeframe) => {
                                const items = getSwimlaneItems(customLane, timeframe);
                                const objective = getSwimlaneObjective(customLane, timeframe);
                                return (
                                  <td key={timeframe} className="p-2 align-top group/cell">
                                    <div className="flex items-center gap-1 mb-2">
                                      <Input
                                        value={objective}
                                        onChange={(e) => updateSwimlaneObjective(key, timeframe, e.target.value)}
                                        placeholder="Objective..."
                                        className="text-xs font-medium border-primary/30"
                                      />
                                      {objective && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 opacity-0 group-hover/cell:opacity-100 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500"
                                          onClick={() => createPlanFromSwimlane(key, timeframe, objective)}
                                          title="Do The Thing™ - Create execution plan"
                                        >
                                          <Rocket className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <Textarea
                                      value={items.join('\n')}
                                      onChange={(e) => {
                                        const lines = e.target.value.split('\n').filter(l => l.trim()).slice(0, 5);
                                        updateSwimlaneItems(key, timeframe, lines);
                                      }}
                                      placeholder="• Action 1&#10;• Action 2&#10;• Action 3"
                                      className="min-h-[60px] text-xs"
                                    />
                                  </td>
                                );
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Sections (collapsed by default) */}
          {/* Kill List */}
          <Card className={expandedSections.has("kill") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("kill")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Skull className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Kill List</CardTitle>
                    <CardDescription>Explicit "will not do" list. Must grow before roadmap grows.</CardDescription>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has("kill") ? "rotate-90" : ""}`} />
              </div>
            </CardHeader>
            {expandedSections.has("kill") && (
              <CardContent>
                <Textarea
                  value={canvas.killList?.join('\n') || ''}
                  onChange={(e) => {
                    const items = e.target.value.split('\n').filter(l => l.trim());
                    updateCanvas({ killList: items });
                  }}
                  placeholder="• We will NOT...&#10;• We refuse to...&#10;• We are killing..."
                  className="min-h-[120px]"
                />
              </CardContent>
            )}
          </Card>

          {/* Strategy Summary */}
          <Card className={expandedSections.has("strategy") ? "border-primary/50" : ""}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("strategy")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Strategy (1 Page)</CardTitle>
                    <CardDescription>Synthesized from above. No adjectives. Only facts.</CardDescription>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.has("strategy") ? "rotate-90" : ""}`} />
              </div>
            </CardHeader>
            {expandedSections.has("strategy") && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Core</label>
                    <Textarea
                      value={canvas.strategy?.core || ''}
                      onChange={(e) => updateCanvas({
                        strategy: { ...canvas.strategy!, core: e.target.value }
                      })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expansion</label>
                    <Textarea
                      value={canvas.strategy?.expansion || ''}
                      onChange={(e) => updateCanvas({
                        strategy: { ...canvas.strategy!, expansion: e.target.value }
                      })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Org Shift</label>
                    <Textarea
                      value={canvas.strategy?.orgShift || ''}
                      onChange={(e) => updateCanvas({
                        strategy: { ...canvas.strategy!, orgShift: e.target.value }
                      })}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Founder Role</label>
                    <Textarea
                      value={canvas.strategy?.founderRole || ''}
                      onChange={(e) => updateCanvas({
                        strategy: { ...canvas.strategy!, founderRole: e.target.value }
                      })}
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Top Risks</label>
                  <Textarea
                    value={canvas.strategy?.topRisks?.join('\n') || ''}
                    onChange={(e) => updateCanvas({
                      strategy: { ...canvas.strategy!, topRisks: e.target.value.split('\n').filter(l => l.trim()) }
                    })}
                    placeholder="• Risk 1&#10;• Risk 2&#10;• Risk 3"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* AI Chat Sidebar */}
      {showAIChat && (
        <div className="w-96 border-l bg-card flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">AI Strategy Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowAIChat(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-8'
                      : 'bg-muted/50 mr-8'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t space-y-2">
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1">
              {[
                "Is our positioning too generic?",
                "What's the real constraint here?",
                "Challenge our 'why we win'",
                "Prioritize the swimlanes",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    handleInputChange({ target: { value: prompt } } as any);
                    setTimeout(() => handleSubmit({ preventDefault: () => {} } as any), 100);
                  }}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about the strategy..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={aiLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
