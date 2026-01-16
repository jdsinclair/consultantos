"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Rocket,
  Target,
  FileText,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Shield,
  StickyNote,
  Star,
  Zap,
  TrendingUp,
  ArrowRight,
  Map,
  Layers,
  CheckSquare,
  Clock,
  Tag,
  ListChecks,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface SharedItem {
  id: string;
  itemType: string;
  itemId: string;
  displayName?: string;
  displayOrder: number;
  deepLinkToken?: string;
  data?: any;
}

interface Portal {
  id: string;
  name?: string;
  welcomeMessage?: string;
  brandColor?: string;
  client: Client;
}

interface PortalData {
  portal: Portal;
  items: SharedItem[];
}

export default function ClientPortalPage({
  params,
}: {
  params: { token: string };
}) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null);
  const [expandedView, setExpandedView] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Get item ID from query param for deep linking
  const deepLinkItemId = searchParams.get("item");

  // Use ref to track selected item ID without causing callback recreation
  const selectedItemIdRef = useRef<string | null>(null);
  
  // Update ref when selectedItem changes
  useEffect(() => {
    selectedItemIdRef.current = selectedItem?.id || null;
  }, [selectedItem]);

  const fetchPortal = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/portal/${params.token}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError("This portal link is invalid or has expired.");
        } else {
          setError("Failed to load portal.");
        }
        return;
      }
      const data = await res.json();
      setPortalData(data);

      // Only auto-select on initial load, not on poll updates
      if (!initialLoadDone && data.items?.length > 0) {
        if (deepLinkItemId) {
          // Find the item matching the deep link
          const deepLinkedItem = data.items.find(
            (item: SharedItem) => item.itemId === deepLinkItemId
          );
          if (deepLinkedItem) {
            setSelectedItem(deepLinkedItem);
            setExpandedView(true);
          } else {
            setSelectedItem(data.items[0]);
          }
        } else {
          setSelectedItem(data.items[0]);
        }
        setInitialLoadDone(true);
      } else if (initialLoadDone && selectedItemIdRef.current) {
        // Update selected item data on poll (keep same selection) - use ref to avoid dependency
        const updatedItem = data.items.find(
          (item: SharedItem) => item.id === selectedItemIdRef.current
        );
        if (updatedItem) {
          setSelectedItem(updatedItem);
        }
      }
    } catch (e) {
      console.error("Failed to fetch portal:", e);
      if (!initialLoadDone) {
        setError("Failed to load portal.");
      }
    } finally {
      setLoading(false);
    }
  }, [params.token, deepLinkItemId, initialLoadDone]); // Removed selectedItem from deps

  useEffect(() => {
    fetchPortal();
    // Poll for updates every 3 seconds (live updates from consultant)
    const interval = setInterval(fetchPortal, 3000);
    return () => clearInterval(interval);
  }, [fetchPortal]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground">
              {error || "This link may be invalid or expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { portal, items } = portalData;
  const brandColor = portal.brandColor || "#f97316"; // Default orange

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header
        className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10"
        style={{ borderBottomColor: brandColor }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <Building2 className="h-5 w-5" style={{ color: brandColor }} />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {portal.name || `${portal.client.name}'s Workspace`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {portal.client.company || portal.client.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Message */}
        {portal.welcomeMessage && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                {portal.welcomeMessage}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-8">
          {/* Sidebar - Item List */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Shared Items
            </h2>
            <div className="space-y-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedItem?.id === item.id && "ring-2 ring-primary shadow-md"
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${brandColor}20` }}
                      >
                        {item.itemType === "execution_plan" ? (
                          <Rocket className="h-4 w-4" style={{ color: brandColor }} />
                        ) : item.itemType === "clarity_canvas" ? (
                          <Target className="h-4 w-4" style={{ color: brandColor }} />
                        ) : item.itemType === "roadmap" ? (
                          <Map className="h-4 w-4" style={{ color: brandColor }} />
                        ) : (
                          <FileText className="h-4 w-4" style={{ color: brandColor }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.displayName || item.data?.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.itemType.replace("_", " ")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {items.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No items shared yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content - Item Preview */}
          <div className="flex-1">
            {selectedItem ? (
              <Card className="shadow-sm">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${brandColor}20` }}
                      >
                        {selectedItem.itemType === "execution_plan" ? (
                          <Rocket className="h-5 w-5" style={{ color: brandColor }} />
                        ) : selectedItem.itemType === "clarity_canvas" ? (
                          <Target className="h-5 w-5" style={{ color: brandColor }} />
                        ) : selectedItem.itemType === "roadmap" ? (
                          <Map className="h-5 w-5" style={{ color: brandColor }} />
                        ) : (
                          <FileText className="h-5 w-5" style={{ color: brandColor }} />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {selectedItem.displayName ||
                            selectedItem.data?.title ||
                            "Untitled"}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedItem.itemType.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedView(!expandedView)}
                    >
                      {expandedView ? (
                        <>
                          <Minimize2 className="h-4 w-4 mr-2" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Expand
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {selectedItem.itemType === "execution_plan" &&
                    selectedItem.data && (
                      expandedView ? (
                        <ExecutionPlanFullView plan={selectedItem.data} brandColor={brandColor} />
                      ) : (
                        <ExecutionPlanPreview plan={selectedItem.data} brandColor={brandColor} />
                      )
                    )}
                  {selectedItem.itemType === "clarity_canvas" &&
                    selectedItem.data && (
                      expandedView ? (
                        <ClarityCanvasFullView canvas={selectedItem.data} brandColor={brandColor} />
                      ) : (
                        <ClarityCanvasPreview canvas={selectedItem.data} brandColor={brandColor} />
                      )
                    )}
                  {selectedItem.itemType === "roadmap" &&
                    selectedItem.data && (
                      expandedView ? (
                        <RoadmapFullView roadmap={selectedItem.data} brandColor={brandColor} />
                      ) : (
                        <RoadmapPreview roadmap={selectedItem.data} brandColor={brandColor} />
                      )
                    )}
                  {!selectedItem.data && (
                    <p className="text-muted-foreground text-sm">
                      Unable to load item data.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select an item from the sidebar to view it.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by ConsultantOS
          </p>
        </div>
      </footer>
    </div>
  );
}

// Preview components for different item types
function ExecutionPlanPreview({
  plan,
  brandColor,
}: {
  plan: any;
  brandColor: string;
}) {
  // Calculate progress
  const getProgress = () => {
    if (!plan?.sections) return { done: 0, total: 0 };
    let done = 0,
      total = 0;

    const countItems = (items: any[]) => {
      items?.forEach((item) => {
        total++;
        if (item.done) done++;
        if (item.children) countItems(item.children);
      });
    };

    plan.sections.forEach((s: any) => countItems(s.items));
    return { done, total };
  };

  const progress = getProgress();
  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.objective && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Objective
            </p>
            <p className="text-sm">{plan.objective}</p>
          </div>
        )}
        {plan.goal && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Goal
            </p>
            <p className="text-sm">{plan.goal}</p>
          </div>
        )}
        {plan.timeframe && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Timeframe
            </p>
            <p className="text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {plan.timeframe}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Status
          </p>
          <Badge
            variant="outline"
            className={cn(
              plan.status === "active" && "bg-green-500/20 text-green-500",
              plan.status === "completed" && "bg-blue-500/20 text-blue-500",
              plan.status === "draft" && "bg-yellow-500/20 text-yellow-500"
            )}
          >
            {plan.status}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      {progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress.done} of {progress.total} items ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: brandColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Sections Summary */}
      {plan.sections?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Sections
          </p>
          <div className="space-y-2">
            {plan.sections.map((section: any) => {
              const sectionDone = section.items?.filter((i: any) => i.done).length || 0;
              const sectionTotal = section.items?.length || 0;

              return (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium">{section.title}</span>
                  <div className="flex items-center gap-2">
                    {section.status && (
                      <Badge variant="outline" className="text-xs">
                        {section.status.replace("_", " ")}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {sectionDone}/{sectionTotal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClarityCanvasPreview({
  canvas,
  brandColor,
}: {
  canvas: any;
  brandColor: string;
}) {
  const strategicTruth = canvas.strategicTruth || {};

  return (
    <div className="space-y-6">
      {/* Strategic Truth Summary */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Strategic Truth
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(strategicTruth).slice(0, 4).map(([key, box]: [string, any]) => (
            <div
              key={key}
              className={cn(
                "p-3 rounded-lg border",
                box?.status === "locked"
                  ? "border-primary/50 bg-primary/5"
                  : "bg-muted/30"
              )}
            >
              <p className="text-xs text-muted-foreground capitalize mb-1">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </p>
              <p className="text-sm">
                {box?.value || (
                  <span className="text-muted-foreground italic">
                    Not yet defined
                  </span>
                )}
              </p>
              {box?.status === "locked" && (
                <Badge
                  variant="outline"
                  className="mt-2 text-xs"
                  style={{
                    backgroundColor: `${brandColor}20`,
                    color: brandColor,
                    borderColor: brandColor,
                  }}
                >
                  Locked
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Primary Constraint */}
      {canvas.coreEngine?.primaryConstraint && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Primary Constraint
          </p>
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: `${brandColor}10`,
              borderColor: `${brandColor}40`,
            }}
          >
            <p className="text-sm font-medium">{canvas.coreEngine.primaryConstraint}</p>
          </div>
        </div>
      )}

      {/* Kill List */}
      {canvas.killList?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Kill List
          </p>
          <ul className="space-y-1">
            {canvas.killList.slice(0, 5).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-red-500 font-bold">x</span>
                {item}
              </li>
            ))}
            {canvas.killList.length > 5 && (
              <li className="text-xs text-muted-foreground">
                +{canvas.killList.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Full view component for clarity canvas - shows all sections
function ClarityCanvasFullView({
  canvas,
  brandColor,
}: {
  canvas: any;
  brandColor: string;
}) {
  const strategicTruth = canvas.strategicTruth || {};
  const northStar = canvas.northStar || {};
  const coreEngine = canvas.coreEngine || {};
  const valueExpansion = canvas.valueExpansion || {};
  const paranoiaMap = canvas.paranoiaMap || {};
  const strategy = canvas.strategy || {};
  const swimlanes = canvas.swimlanes || {};

  // Helper to format camelCase to Title Case
  const formatKey = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

  // Helper to get items from swimlane timeframe (handles both new and legacy format)
  const getSwimlanItems = (timeframe: any) => {
    if (!timeframe) return [];
    if (Array.isArray(timeframe)) return timeframe;
    if (timeframe.items) return timeframe.items;
    return [];
  };

  // Check if swimlanes has any content
  const hasSwimlanesContent = Object.entries(swimlanes).some(([key, lane]: [string, any]) => {
    if (!lane) return false;
    return getSwimlanItems(lane.short).length > 0 || 
           getSwimlanItems(lane.mid).length > 0 || 
           getSwimlanItems(lane.long).length > 0;
  });

  return (
    <div className="space-y-8">
      {/* Strategic Truth - All boxes */}
      {Object.keys(strategicTruth).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: brandColor }} />
            Strategic Truth
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(strategicTruth).map(([key, box]: [string, any]) => (
              <div
                key={key}
                className={cn(
                  "p-4 rounded-lg border",
                  box?.status === "locked"
                    ? "border-primary/50 bg-primary/5"
                    : "bg-muted/30"
                )}
              >
                <p className="text-xs text-muted-foreground capitalize mb-1 font-medium">
                  {formatKey(key)}
                </p>
                <p className="text-sm">
                  {box?.value || (
                    <span className="text-muted-foreground italic">Not yet defined</span>
                  )}
                </p>
                {box?.status === "locked" && (
                  <Badge
                    variant="outline"
                    className="mt-2 text-xs"
                    style={{ backgroundColor: `${brandColor}20`, color: brandColor, borderColor: brandColor }}
                  >
                    Locked
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* North Star - Actual structure: revenueTarget, marginFloor, founderRole, complexityCeiling */}
      {Object.keys(northStar).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" />
            North Star Constraints
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {northStar.revenueTarget && (
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <p className="text-xs text-success font-medium mb-1">Revenue Target</p>
                <p className="text-sm">{northStar.revenueTarget}</p>
              </div>
            )}
            {northStar.marginFloor && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary font-medium mb-1">Margin Floor</p>
                <p className="text-sm">{northStar.marginFloor}</p>
              </div>
            )}
            {northStar.founderRole && (
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                <p className="text-xs text-warning font-medium mb-1">Founder Role (Stop Doing)</p>
                <p className="text-sm">{northStar.founderRole}</p>
              </div>
            )}
            {northStar.complexityCeiling && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">Complexity Ceiling</p>
                <p className="text-sm">{northStar.complexityCeiling}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Core Engine - Actual structure: areas with answer/warning + primaryConstraint */}
      {(coreEngine.primaryConstraint || Object.keys(coreEngine).length > 1) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Core Engine (Reality Diagnosis)
          </h3>
          {coreEngine.primaryConstraint && (
            <div className="p-4 rounded-lg border-2 mb-4" style={{ backgroundColor: `${brandColor}10`, borderColor: `${brandColor}40` }}>
              <p className="text-xs font-medium mb-1" style={{ color: brandColor }}>Primary Constraint</p>
              <p className="text-sm font-medium">{coreEngine.primaryConstraint}</p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(coreEngine).filter(([key]) => key !== 'primaryConstraint').map(([key, area]: [string, any]) => (
              area?.answer && (
                <div key={key} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{formatKey(key)}</p>
                  <p className="text-sm">{area.answer}</p>
                  {area.warning && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {area.warning}
                    </p>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Value Expansion - Actual structure: left/core/right/vertical with items */}
      {(valueExpansion.left?.items?.length > 0 || valueExpansion.core?.items?.length > 0 || 
        valueExpansion.right?.items?.length > 0 || valueExpansion.vertical?.items?.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Value Expansion Map
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {['left', 'core', 'right', 'vertical'].map((direction) => {
              const items = valueExpansion[direction]?.items || [];
              if (items.length === 0) return null;
              return (
                <div key={direction} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground font-medium mb-2 capitalize">{direction}</p>
                  <ul className="space-y-1">
                    {items.map((item: any, i: number) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-success flex-shrink-0" />
                        {item.name || item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kill List - Full */}
      {canvas.killList?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-destructive font-bold">✕</span>
            Kill List
          </h3>
          <div className="grid gap-2 md:grid-cols-2">
            {canvas.killList.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                <span className="text-destructive font-bold flex-shrink-0">✕</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paranoia Map - Actual structure: external/internal/existential with items */}
      {(paranoiaMap.external?.length > 0 || paranoiaMap.internal?.length > 0 || paranoiaMap.existential?.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Paranoia Map
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {paranoiaMap.external?.length > 0 && (
              <div>
                <p className="text-xs text-warning font-medium mb-2">External Threats</p>
                <ul className="space-y-2">
                  {paranoiaMap.external.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-warning/5 border border-warning/20 text-sm">
                      <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" />
                      {typeof item === 'string' ? item : item.text || item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {paranoiaMap.internal?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Internal Risks</p>
                <ul className="space-y-2">
                  {paranoiaMap.internal.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
                      <span className="text-muted-foreground">!</span>
                      {typeof item === 'string' ? item : item.text || item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {paranoiaMap.existential?.length > 0 && (
              <div>
                <p className="text-xs text-destructive font-medium mb-2">Existential Threats</p>
                <ul className="space-y-2">
                  {paranoiaMap.existential.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                      <span className="text-destructive">☠</span>
                      {typeof item === 'string' ? item : item.text || item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Strategy */}
      {(strategy.oneLiner || strategy.keyMoves?.length > 0 || strategy.thesis) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: brandColor }} />
            Strategy
          </h3>
          {(strategy.oneLiner || strategy.thesis) && (
            <div className="p-4 rounded-lg border-2 mb-4" style={{ backgroundColor: `${brandColor}10`, borderColor: `${brandColor}40` }}>
              <p className="text-xs text-muted-foreground mb-1">Strategic Thesis</p>
              <p className="text-base font-medium">{strategy.oneLiner || strategy.thesis}</p>
            </div>
          )}
          {strategy.keyMoves?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Key Moves</p>
              <div className="space-y-2">
                {strategy.keyMoves.map((move: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {typeof move === 'string' ? move : move.text || move.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Swimlanes - Actual structure: named lanes (web, sales, etc.) each with short/mid/long */}
      {hasSwimlanesContent && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Execution Swimlanes
          </h3>
          <div className="space-y-4">
            {Object.entries(swimlanes).map(([laneKey, lane]: [string, any]) => {
              if (!lane) return null;
              const shortItems = getSwimlanItems(lane.short);
              const midItems = getSwimlanItems(lane.mid);
              const longItems = getSwimlanItems(lane.long);
              if (shortItems.length === 0 && midItems.length === 0 && longItems.length === 0) return null;
              
              return (
                <div key={laneKey} className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b border-border/50">
                    <p className="text-sm font-medium">{formatKey(laneKey)}</p>
                  </div>
                  <div className="grid md:grid-cols-3 divide-x divide-border/50">
                    <div className="p-3">
                      <p className="text-xs text-success font-medium mb-2">Short (30 days)</p>
                      {shortItems.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {shortItems.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-success">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground">—</p>}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-warning font-medium mb-2">Mid (90 days)</p>
                      {midItems.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {midItems.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-warning">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground">—</p>}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-primary font-medium mb-2">Long (12 months)</p>
                      {longItems.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {longItems.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-primary">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground">—</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Full view component for execution plans - shows all sections and items
function ExecutionPlanFullView({
  plan,
  brandColor,
}: {
  plan: any;
  brandColor: string;
}) {
  // Calculate progress
  const getProgress = () => {
    if (!plan?.sections) return { done: 0, total: 0 };
    let done = 0,
      total = 0;

    const countItems = (items: any[]) => {
      items?.forEach((item) => {
        total++;
        if (item.done) done++;
        if (item.children) countItems(item.children);
      });
    };

    plan.sections.forEach((s: any) => countItems(s.items));
    return { done, total };
  };

  const progress = getProgress();
  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.objective && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Objective
            </p>
            <p className="text-sm">{plan.objective}</p>
          </div>
        )}
        {plan.goal && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Goal
            </p>
            <p className="text-sm">{plan.goal}</p>
          </div>
        )}
        {plan.timeframe && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Timeframe
            </p>
            <p className="text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {plan.timeframe}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Status
          </p>
          <Badge
            variant="outline"
            className={cn(
              plan.status === "active" && "bg-green-500/20 text-green-500",
              plan.status === "completed" && "bg-blue-500/20 text-blue-500",
              plan.status === "draft" && "bg-yellow-500/20 text-yellow-500"
            )}
          >
            {plan.status}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      {progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress.done} of {progress.total} items ({progressPercent}%)
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: brandColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Success Metrics */}
      {(plan.successMetrics?.quantitative?.length > 0 ||
        plan.successMetrics?.qualitative?.length > 0) && (
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" style={{ color: brandColor }} />
            How Do We Know It Works?
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {plan.successMetrics?.quantitative?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Quantitative</p>
                <ul className="space-y-1">
                  {plan.successMetrics.quantitative.map((m: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.successMetrics?.qualitative?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Qualitative</p>
                <ul className="space-y-1">
                  {plan.successMetrics.qualitative.map((m: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Sections with Items */}
      {plan.sections?.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: brandColor }} />
            The Plan
          </p>
          {plan.sections.map((section: any) => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/30 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{section.title}</span>
                  <div className="flex items-center gap-2">
                    {section.status && (
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        section.status === "in_progress" && "bg-blue-500/20 text-blue-500",
                        section.status === "done" && "bg-green-500/20 text-green-500",
                        section.status === "blocked" && "bg-red-500/20 text-red-500"
                      )}>
                        {section.status.replace("_", " ")}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {section.items?.length || 0} items
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Section Context */}
              {(section.why || section.what || section.notes) && (
                <div className="p-3 bg-muted/20 border-b text-sm space-y-1">
                  {section.why && (
                    <p><span className="font-medium" style={{ color: brandColor }}>Why:</span> {section.why}</p>
                  )}
                  {section.what && (
                    <p><span className="font-medium text-green-600">Success:</span> {section.what}</p>
                  )}
                  {section.notes && (
                    <p><span className="font-medium text-yellow-600">Note:</span> {section.notes}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="p-3 space-y-1">
                {section.items?.map((item: any) => (
                  <PortalPlanItem key={item.id} item={item} depth={0} brandColor={brandColor} />
                ))}
                {(!section.items || section.items.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">No items yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-yellow-600" />
            Notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}

      {/* Rules */}
      {plan.rules?.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-red-500" />
            Rules & Constraints
          </p>
          <ul className="space-y-2">
            {plan.rules.map((rule: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Recursive item component for portal view
function PortalPlanItem({
  item,
  depth,
  brandColor,
}: {
  item: any;
  depth: number;
  brandColor: string;
}) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 py-1">
        <div className="w-4 flex-shrink-0">
          {hasChildren && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
        <Checkbox checked={item.done} disabled className="cursor-default" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", item.done && "line-through text-muted-foreground")}>
              {item.text || "(Empty item)"}
            </span>
            {item.priority && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                  item.priority === "now" && "bg-red-500/20 text-red-500 border-red-500/30",
                  item.priority === "next" && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                  item.priority === "later" && "bg-muted text-muted-foreground"
                )}
              >
                {item.priority}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</p>
          )}
        </div>
      </div>
      {hasChildren && (
        <div>
          {item.children.map((child: any) => (
            <PortalPlanItem key={child.id} item={child} depth={depth + 1} brandColor={brandColor} />
          ))}
        </div>
      )}
    </div>
  );
}

// Roadmap Preview - CEO View (High-level summary)
function RoadmapPreview({
  roadmap,
  brandColor,
}: {
  roadmap: any;
  brandColor: string;
}) {
  const swimlanes = roadmap.swimlanes || [];
  const items = roadmap.items || [];
  const backlog = roadmap.backlog || [];
  const tags = roadmap.tags || [];

  // Calculate overall progress
  const totalItems = items.length;
  const completedItems = items.filter((item: any) => item.status === "done").length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Count items by swimlane (use swimlaneKey to match lane.key)
  const swimlaneStats = swimlanes.map((lane: any) => {
    const laneItems = items.filter((item: any) => item.swimlaneKey === lane.key);
    const completed = laneItems.filter((item: any) => item.status === "done").length;
    return {
      key: lane.key,
      name: lane.label || lane.name,
      total: laneItems.length,
      completed,
    };
  });

  // Get items by status for quick overview
  const inProgress = items.filter((item: any) => item.status === "in_progress").length;
  const notStarted = items.filter((item: any) => item.status === "idea" || item.status === "planned" || !item.status).length;

  return (
    <div className="space-y-6">
      {/* Vision & Objective */}
      <div className="grid gap-4 md:grid-cols-2">
        {roadmap.vision && (
          <div className="p-4 rounded-lg border-2" style={{ backgroundColor: `${brandColor}10`, borderColor: `${brandColor}40` }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Star className="h-3 w-3" style={{ color: brandColor }} />
              Vision
            </p>
            <p className="text-sm font-medium">{roadmap.vision}</p>
          </div>
        )}
        {roadmap.objective && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Objective
            </p>
            <p className="text-sm">{roadmap.objective}</p>
          </div>
        )}
      </div>

      {/* Planning Horizon & Status */}
      <div className="flex items-center gap-4 flex-wrap">
        {roadmap.planningHorizon && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{roadmap.planningHorizon}</span>
          </div>
        )}
        <Badge
          variant="outline"
          className={cn(
            roadmap.status === "active" && "bg-green-500/20 text-green-500",
            roadmap.status === "completed" && "bg-blue-500/20 text-blue-500",
            roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500"
          )}
        >
          {roadmap.status || "draft"}
        </Badge>
      </div>

      {/* Progress Overview */}
      {totalItems > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, backgroundColor: brandColor }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {completedItems} Done
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              {inProgress} In Progress
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-muted-foreground" />
              {notStarted} To Do
            </span>
          </div>
        </div>
      )}

      {/* Swimlanes Summary */}
      {swimlaneStats.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Swimlanes</p>
          <div className="grid gap-2 md:grid-cols-2">
            {swimlaneStats.filter((s: any) => s.total > 0).map((lane: any) => (
              <div key={lane.key} className="p-3 rounded-lg bg-muted/30 border flex items-center justify-between">
                <span className="text-sm font-medium">{lane.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {lane.completed}/{lane.total}
                  </span>
                  {lane.total > 0 && (
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(lane.completed / lane.total) * 100}%`,
                          backgroundColor: brandColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backlog & Tags counts */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {backlog.length > 0 && (
          <span className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            {backlog.length} items in backlog
          </span>
        )}
        {tags.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            {tags.length} tags
          </span>
        )}
      </div>
    </div>
  );
}

// Roadmap Full View - PM View (Detailed)
function RoadmapFullView({
  roadmap,
  brandColor,
}: {
  roadmap: any;
  brandColor: string;
}) {
  const swimlanes = roadmap.swimlanes || [];
  const items = roadmap.items || [];
  const backlog = roadmap.backlog || [];
  const tags = roadmap.tags || [];

  // Calculate overall progress
  const totalItems = items.length;
  const completedItems = items.filter((item: any) => item.status === "done").length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Get tag by ID
  const getTag = (tagId: string) => tags.find((t: any) => t.id === tagId);

  // Group items by swimlane (use swimlaneKey to match lane.key)
  const getItemsForSwimlane = (swimlaneKey: string) =>
    items.filter((item: any) => item.swimlaneKey === swimlaneKey);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "blocked": return "bg-red-500";
      case "planned": return "bg-yellow-500";
      case "idea": return "bg-slate-400";
      default: return "bg-muted-foreground/50";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "done": return "bg-green-500/20 text-green-600 border-green-500/30";
      case "in_progress": return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "blocked": return "bg-red-500/20 text-red-600 border-red-500/30";
      case "planned": return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "idea": return "bg-slate-500/20 text-slate-600 border-slate-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return "idea";
    return status.replace(/_/g, " ");
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roadmap.vision && (
          <div className="md:col-span-2 p-4 rounded-lg border-2" style={{ backgroundColor: `${brandColor}10`, borderColor: `${brandColor}40` }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Star className="h-3 w-3" style={{ color: brandColor }} />
              Vision
            </p>
            <p className="text-sm font-medium">{roadmap.vision}</p>
          </div>
        )}
        {roadmap.objective && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
            <p className="text-sm">{roadmap.objective}</p>
          </div>
        )}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Timeline</p>
          <p className="text-sm flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {roadmap.planningHorizon || "Not set"}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "mt-2",
              roadmap.status === "active" && "bg-green-500/20 text-green-500",
              roadmap.status === "completed" && "bg-blue-500/20 text-blue-500",
              roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500"
            )}
          >
            {roadmap.status || "draft"}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {completedItems} of {totalItems} items complete ({progressPercent}%)
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progressPercent}%`, backgroundColor: brandColor }}
            />
          </div>
        </div>
      )}

      {/* Tags Legend */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Tags:</span>
          {tags.map((tag: any) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Swimlanes with Items */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Map className="h-4 w-4" style={{ color: brandColor }} />
          Roadmap Items by Swimlane
        </h3>

        {swimlanes.map((swimlane: any) => {
          const laneItems = getItemsForSwimlane(swimlane.key);
          if (laneItems.length === 0) return null;

          return (
            <div key={swimlane.key} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" style={{ color: swimlane.color || brandColor }} />
                  <span className="font-medium">{swimlane.label || swimlane.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {laneItems.filter((i: any) => i.status === "done").length}/{laneItems.length} complete
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                {laneItems.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getStatusColor(item.status))} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{item.title || "Untitled"}</h4>
                          <Badge variant="outline" className={cn("text-[10px]", getStatusBadgeStyle(item.status))}>
                            {formatStatus(item.status)}
                          </Badge>
                        </div>

                        {/* Description */}
                        {(item.description || item.notes) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description || item.notes}</p>
                        )}

                        {/* Tags */}
                        {item.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.map((tagId: string) => {
                              const tag = getTag(tagId);
                              if (!tag) return null;
                              return (
                                <span
                                  key={tagId}
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Subtasks */}
                        {item.subtasks?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <ListChecks className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Subtasks ({item.subtasks.filter((s: any) => s.done).length}/{item.subtasks.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {item.subtasks.map((subtask: any) => (
                                <div key={subtask.id} className="flex items-center gap-2 text-xs">
                                  <CheckSquare className={cn("h-3 w-3", subtask.done ? "text-green-500" : "text-muted-foreground")} />
                                  <span className={cn(subtask.done && "line-through text-muted-foreground")}>
                                    {subtask.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Items without swimlane */}
        {items.filter((item: any) => !item.swimlaneKey || !swimlanes.find((s: any) => s.key === item.swimlaneKey)).length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 border-b">
              <span className="font-medium text-muted-foreground">Unassigned Items</span>
            </div>
            <div className="p-4 space-y-3">
              {items.filter((item: any) => !item.swimlaneKey || !swimlanes.find((s: any) => s.key === item.swimlaneKey)).map((item: any) => (
                <div key={item.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(item.status))} />
                    <span className="text-sm">{item.title || "Untitled"}</span>
                    <Badge variant="outline" className={cn("text-[10px]", getStatusBadgeStyle(item.status))}>
                      {formatStatus(item.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backlog */}
      {backlog.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-yellow-500/10 px-4 py-3 border-b border-yellow-500/20 flex items-center gap-2">
            <Layers className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-700 dark:text-yellow-500">Backlog</span>
            <Badge variant="outline" className="text-xs ml-auto">{backlog.length} items</Badge>
          </div>
          <div className="p-4">
            <div className="grid gap-2 md:grid-cols-2">
              {backlog.map((item: any) => (
                <div key={item.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title || "Untitled"}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>
                      )}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tagId: string) => {
                            const tag = getTag(tagId);
                            if (!tag) return null;
                            return (
                              <span
                                key={tagId}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Metrics */}
      {roadmap.successMetrics && (
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm font-medium flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" style={{ color: brandColor }} />
            Success Metrics
          </p>
          <p className="text-sm whitespace-pre-wrap">{roadmap.successMetrics}</p>
        </div>
      )}

      {/* Notes */}
      {roadmap.notes && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-yellow-600" />
            Notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{roadmap.notes}</p>
        </div>
      )}
    </div>
  );
}
