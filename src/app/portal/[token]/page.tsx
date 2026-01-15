"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Rocket,
  Target,
  FileText,
  ChevronRight,
  ExternalLink,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null);

  useEffect(() => {
    async function fetchPortal() {
      try {
        const res = await fetch(`/api/share/portal/${params.token}`);
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
        // Auto-select first item if available
        if (data.items?.length > 0) {
          setSelectedItem(data.items[0]);
        }
      } catch (e) {
        console.error("Failed to fetch portal:", e);
        setError("Failed to load portal.");
      } finally {
        setLoading(false);
      }
    }
    fetchPortal();
  }, [params.token]);

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
                    {selectedItem.deepLinkToken && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url =
                            selectedItem.itemType === "execution_plan"
                              ? `/share/plan/${selectedItem.itemId}`
                              : `/share/clarity/${selectedItem.itemId}`;
                          window.open(url, "_blank");
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Full View
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {selectedItem.itemType === "execution_plan" &&
                    selectedItem.data && (
                      <ExecutionPlanPreview plan={selectedItem.data} brandColor={brandColor} />
                    )}
                  {selectedItem.itemType === "clarity_canvas" &&
                    selectedItem.data && (
                      <ClarityCanvasPreview canvas={selectedItem.data} brandColor={brandColor} />
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
