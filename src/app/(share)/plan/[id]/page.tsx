"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Target,
  Rocket,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart3,
  Shield,
  StickyNote,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface PlanItem {
  id: string;
  text: string;
  done: boolean;
  children?: PlanItem[];
  order: number;
  assignee?: string;
  dueDate?: string;
  notes?: string;
  priority?: "now" | "next" | "later";
  blockedBy?: string;
}

interface PlanSection {
  id: string;
  title: string;
  why?: string;
  what?: string;
  notes?: string;
  status?: "not_started" | "in_progress" | "blocked" | "done";
  items: PlanItem[];
  order: number;
  collapsed?: boolean;
}

interface SuccessMetrics {
  quantitative: string[];
  qualitative: string[];
}

interface ExecutionPlan {
  id: string;
  clientId: string;
  title: string;
  objective?: string;
  timeframe?: string;
  startDate?: string;
  targetDate?: string;
  goal?: string;
  successMetrics?: SuccessMetrics;
  sections?: PlanSection[];
  notes?: string;
  rules?: string[];
  status: string;
  client?: Client;
}

// This is the SHARE VIEW - a clean, shareable view for screen sharing
// NO NAVIGATION, NO SIDEBAR - just the plan content
export default function PlanSharePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const fetchPlan = useCallback(async () => {
    try {
      // Use authenticated API - works when user is logged in (for screen sharing)
      const res = await fetch(`/api/execution-plans/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();
      setPlan(data);
      // Expand all sections by default on first load
      if (data.sections && expandedSections.size === 0) {
        setExpandedSections(new Set(data.sections.map((s: PlanSection) => s.id)));
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id, expandedSections.size]);

  useEffect(() => {
    fetchPlan();
    // Poll for updates every 2 seconds for real-time feel
    const interval = setInterval(fetchPlan, 2000);
    return () => clearInterval(interval);
  }, [fetchPlan]);

  // Calculate progress
  const getProgress = () => {
    if (!plan?.sections) return { done: 0, total: 0 };
    let done = 0,
      total = 0;

    const countItems = (items: PlanItem[]) => {
      items.forEach((item) => {
        total++;
        if (item.done) done++;
        if (item.children) countItems(item.children);
      });
    };

    plan.sections.forEach((s) => countItems(s.items));
    return { done, total };
  };

  const progress = getProgress();
  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Plan not found</p>
          <p className="text-muted-foreground mt-1">
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 print:bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b print:static print:bg-white print:border-b-2">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center print:from-orange-600 print:to-red-700">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{plan.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {plan.client?.name}
                  {plan.client?.company && ` · ${plan.client.company}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 print:hidden">
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Live · {lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6 print:py-4 print:space-y-4">
        {/* Progress Bar */}
        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {progress.done} of {progress.total} items ({progressPercent}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden print:border print:border-gray-300">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500 print:from-orange-600 print:to-red-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan Overview */}
        <Card className="shadow-sm print:shadow-none print:border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Plan Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Objective
              </p>
              <p className="text-sm">{plan.objective || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Goal
              </p>
              <p className="text-sm">{plan.goal || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Timeframe
              </p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {plan.timeframe || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="text-sm capitalize">{plan.status}</p>
            </div>
          </CardContent>
        </Card>

        {/* Success Metrics */}
        {(plan.successMetrics?.quantitative?.length ||
          plan.successMetrics?.qualitative?.length) && (
          <Card className="shadow-sm print:shadow-none print:border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                How Do We Know It Works?
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {plan.successMetrics?.quantitative?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Quantitative
                  </p>
                  <ul className="space-y-1">
                    {plan.successMetrics.quantitative.map((metric, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>{metric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.successMetrics?.qualitative?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Qualitative
                  </p>
                  <ul className="space-y-1">
                    {plan.successMetrics.qualitative.map((metric, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <span>{metric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* The Plan - Sections */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            The Plan
          </h2>

          <div className="space-y-4">
            {plan.sections?.map((section) => (
              <Card
                key={section.id}
                className="shadow-sm overflow-hidden print:shadow-none print:border-2 print:break-inside-avoid"
              >
                <CardHeader className="py-3 bg-muted/30 print:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      className="print:hidden"
                      onClick={() => {
                        setExpandedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) {
                            next.delete(section.id);
                          } else {
                            next.add(section.id);
                          }
                          return next;
                        });
                      }}
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <span className="font-semibold">{section.title}</span>
                    {section.status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          section.status === "in_progress" &&
                            "bg-blue-500/20 text-blue-500",
                          section.status === "done" &&
                            "bg-green-500/20 text-green-500",
                          section.status === "blocked" &&
                            "bg-red-500/20 text-red-500",
                          section.status === "not_started" &&
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {section.status.replace("_", " ")}
                      </Badge>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      {section.items.length} items
                    </Badge>
                  </div>
                </CardHeader>

                {(expandedSections.has(section.id) || true) && (
                  <CardContent
                    className={cn(
                      "pt-3 space-y-3",
                      !expandedSections.has(section.id) && "hidden print:block"
                    )}
                  >
                    {/* Section Context */}
                    {(section.why || section.what || section.notes) && (
                      <div className="grid gap-2 text-sm mb-4 p-3 bg-muted/50 rounded-lg print:bg-gray-50">
                        {section.why && (
                          <div>
                            <span className="font-medium text-orange-500">
                              Why:{" "}
                            </span>
                            <span className="text-muted-foreground">
                              {section.why}
                            </span>
                          </div>
                        )}
                        {section.what && (
                          <div>
                            <span className="font-medium text-green-500">
                              What:{" "}
                            </span>
                            <span className="text-muted-foreground">
                              {section.what}
                            </span>
                          </div>
                        )}
                        {section.notes && (
                          <div>
                            <span className="font-medium text-yellow-500">
                              Note:{" "}
                            </span>
                            <span className="text-muted-foreground">
                              {section.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <SharePlanItemRow key={item.id} item={item} depth={0} />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Notes */}
        {plan.notes && (
          <Card className="shadow-sm print:shadow-none print:border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-yellow-500" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{plan.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Rules */}
        {plan.rules && plan.rules.length > 0 && (
          <Card className="shadow-sm print:shadow-none print:border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Rules & Constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20 print:bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 print:bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Do The Thing™
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tactical Execution Plan
          </p>
        </div>
      </footer>
    </div>
  );
}

// Read-only item display component
function SharePlanItemRow({
  item,
  depth,
}: {
  item: PlanItem;
  depth: number;
}) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 py-1">
        <div className="w-5 flex-shrink-0">
          {hasChildren && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>

        <Checkbox checked={item.done} disabled className="cursor-default" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm",
                item.done && "line-through text-muted-foreground"
              )}
            >
              {item.text || "(Empty item)"}
            </span>
            {item.priority && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                  item.priority === "now" &&
                    "bg-red-500/20 text-red-500 border-red-500/30",
                  item.priority === "next" &&
                    "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                  item.priority === "later" &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {item.priority}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground ml-0 mt-0.5 italic">
              {item.notes}
            </p>
          )}
        </div>
      </div>

      {hasChildren && (
        <div>
          {item.children!.map((child) => (
            <SharePlanItemRow key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
