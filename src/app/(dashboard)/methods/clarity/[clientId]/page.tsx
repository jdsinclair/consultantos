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
  DEFAULT_CANVAS,
  ClarityBox,
} from "@/lib/clarity-method/types";

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
  const [aiMessage, setAiMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["truth"]));
  const [hasChanges, setHasChanges] = useState(false);

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
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 text-sm">
                <span className={viewMode === "founder" ? "text-foreground" : "text-muted-foreground"}>
                  Founder
                </span>
                <Switch
                  checked={viewMode === "coach"}
                  onCheckedChange={(checked) => setViewMode(checked ? "coach" : "founder")}
                />
                <span className={viewMode === "coach" ? "text-foreground" : "text-muted-foreground"}>
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
                            onClick={() => !isLocked && lockStrategicTruth(key)}
                            disabled={isLocked || !box?.value}
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
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-red-400">
                              ❌ {config.badAnswers[0]}
                            </p>
                            <p className="text-xs text-green-400">
                              ✓ {config.goodExamples[0].slice(0, 80)}...
                            </p>
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
                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(CORE_ENGINE_CONFIG) as (keyof typeof CORE_ENGINE_CONFIG)[]).map((key) => {
                    const config = CORE_ENGINE_CONFIG[key];
                    const answer = canvas.coreEngine?.[key];
                    const value = typeof answer === 'string' ? answer : answer?.answer || '';
                    const warning = typeof answer === 'object' ? answer?.warning : undefined;

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">{config.question}</label>
                          {viewMode === "coach" && (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {config.warning}
                            </span>
                          )}
                        </div>
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
                    <CardDescription>Time-phased execution: Short / Mid / Long</CardDescription>
                  </div>
                </div>
                {expandedSections.has("swimlanes") ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has("swimlanes") && (
              <CardContent>
                {viewMode === "coach" && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <strong>Question per cell:</strong> "{SWIMLANE_QUESTION}"
                    <br />
                    <span className="text-muted-foreground">Max 3 bullets per cell.</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Area</th>
                        <th className="text-left p-2 font-medium">Short (0-90d)</th>
                        <th className="text-left p-2 font-medium">Mid (3-12mo)</th>
                        <th className="text-left p-2 font-medium">Long (12-24mo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(SWIMLANE_LABELS) as (keyof typeof SWIMLANE_LABELS)[]).slice(0, 8).map((key) => (
                        <tr key={key} className="border-b">
                          <td className="p-2 font-medium text-muted-foreground whitespace-nowrap">
                            {SWIMLANE_LABELS[key]}
                          </td>
                          {(['short', 'mid', 'long'] as const).map((timeframe) => (
                            <td key={timeframe} className="p-2">
                              <Textarea
                                value={canvas.swimlanes?.[key]?.[timeframe]?.join('\n') || ''}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n').filter(l => l.trim()).slice(0, 3);
                                  updateCanvas({
                                    swimlanes: {
                                      ...canvas.swimlanes!,
                                      [key]: {
                                        ...canvas.swimlanes?.[key],
                                        [timeframe]: lines,
                                      },
                                    },
                                  });
                                }}
                                placeholder="• Bullet 1&#10;• Bullet 2&#10;• Bullet 3"
                                className="min-h-[80px] text-xs"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
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
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p>I can help you:</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Pressure-test your strategic truth</li>
                  <li>• Identify the real constraint</li>
                  <li>• Challenge generic answers</li>
                  <li>• Suggest execution priorities</li>
                </ul>
              </div>
              {viewMode === "coach" && (
                <div className="bg-primary/5 p-3 rounded-lg text-sm border border-primary/20">
                  <p className="font-medium text-primary">Coach Mode Active</p>
                  <p className="text-muted-foreground mt-1">
                    You're seeing guidance prompts, bad answer examples, and warning signals.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Ask about the strategy..."
                className="flex-1"
              />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
