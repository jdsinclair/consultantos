"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Map,
  Target,
  Calendar,
  Loader2,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIMEFRAME_CONFIG,
  STATUS_CONFIG,
  SIZE_CONFIG,
  IMPACT_CONFIG,
} from "@/lib/roadmap/types";
import type {
  RoadmapItem,
  RoadmapBacklogItem,
  RoadmapSwimlane,
  RoadmapTimeframe,
} from "@/lib/roadmap/types";

interface Client {
  id: string;
  name: string;
  company?: string;
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
  successMetrics?: {
    quantitative: string[];
    qualitative: string[];
  };
  notes?: string;
  status: string;
  client?: Client;
}

export default function RoadmapSharePage({ params }: { params: { id: string } }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setRoadmap(data);
        if (data.swimlanes) {
          setExpandedSwimlanes(new Set(data.swimlanes.map((s: RoadmapSwimlane) => s.key)));
        }
      })
      .catch((e) => {
        console.error("Failed to load roadmap:", e);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const getItemsForCell = (swimlaneKey: string, timeframe: RoadmapTimeframe) => {
    return roadmap?.items?.filter(i => i.swimlaneKey === swimlaneKey && i.timeframe === timeframe) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Roadmap not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Map className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{roadmap.title}</h1>
              <Badge variant="outline" className={cn(
                "text-sm",
                roadmap.status === "active" && "bg-green-500/20 text-green-500",
                roadmap.status === "review" && "bg-purple-500/20 text-purple-500",
                roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500"
              )}>
                {roadmap.status}
              </Badge>
            </div>
            {roadmap.client && (
              <p className="text-lg text-muted-foreground mt-1">
                {roadmap.client.name}
                {roadmap.client.company && ` · ${roadmap.client.company}`}
              </p>
            )}
          </div>
          {roadmap.planningHorizon && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Planning Horizon</p>
              <p className="text-lg font-medium flex items-center gap-2 justify-end">
                <Calendar className="h-4 w-4" />
                {roadmap.planningHorizon}
              </p>
            </div>
          )}
        </div>

        {/* Overview */}
        {(roadmap.objective || roadmap.vision) && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {roadmap.objective && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Target className="h-4 w-4" />
                      Objective
                    </div>
                    <p className="text-lg">{roadmap.objective}</p>
                  </div>
                )}
                {roadmap.vision && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      Vision
                    </div>
                    <p className="text-lg">{roadmap.vision}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Board */}
        <div className="space-y-4">
          {/* Timeframe Headers */}
          <div className="grid grid-cols-[220px_1fr_1fr_1fr_1fr] gap-3">
            <div className="font-semibold text-muted-foreground">Swimlanes</div>
            {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => (
              <div key={tf} className="text-center pb-2 border-b-2" style={{ borderColor: TIMEFRAME_CONFIG[tf].color }}>
                <div className="text-lg font-semibold" style={{ color: TIMEFRAME_CONFIG[tf].color }}>
                  {TIMEFRAME_CONFIG[tf].label}
                </div>
                <div className="text-sm text-muted-foreground">{TIMEFRAME_CONFIG[tf].sublabel}</div>
              </div>
            ))}
          </div>

          {/* Swimlane Rows */}
          {roadmap.swimlanes?.map((swimlane) => (
            <div key={swimlane.key} className="space-y-2">
              {/* Swimlane Header */}
              <button
                className="flex items-center gap-2 w-full text-left"
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
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: swimlane.color }}
                />
                <span className="font-semibold">{swimlane.label}</span>
                <Badge variant="outline" className="text-xs ml-2">
                  {roadmap.items?.filter(i => i.swimlaneKey === swimlane.key).length || 0} items
                </Badge>
              </button>

              {/* Swimlane Grid */}
              {expandedSwimlanes.has(swimlane.key) && (
                <div className="grid grid-cols-[220px_1fr_1fr_1fr_1fr] gap-3">
                  <div /> {/* Empty cell for alignment */}
                  {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => {
                    const items = getItemsForCell(swimlane.key, tf);
                    return (
                      <div
                        key={`${swimlane.key}-${tf}`}
                        className="min-h-[80px] rounded-lg border border-muted p-2 space-y-2 bg-muted/10"
                      >
                        {items.map((item) => (
                          <ShareItemCard key={item.id} item={item} />
                        ))}
                        {items.length === 0 && (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Backlog */}
        {roadmap.backlog && roadmap.backlog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-500" />
                Backlog ({roadmap.backlog.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {roadmap.backlog.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg"
                  >
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.suggestedTimeframe && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Suggested: {item.suggestedTimeframe}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {roadmap.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{roadmap.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Roadmap powered by ConsultantOS</p>
        </div>
      </div>
    </div>
  );
}

// Share Item Card (read-only)
function ShareItemCard({ item }: { item: RoadmapItem }) {
  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <div className="p-3 bg-background border rounded-lg">
      <div className="flex items-start gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: statusConfig.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {statusConfig.label}
            </Badge>
            {item.size && (
              <Badge variant="outline" className="text-xs">
                {SIZE_CONFIG[item.size].label}
              </Badge>
            )}
            {item.metrics?.impact && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: `${IMPACT_CONFIG[item.metrics.impact].color}20`,
                  color: IMPACT_CONFIG[item.metrics.impact].color,
                  borderColor: `${IMPACT_CONFIG[item.metrics.impact].color}50`
                }}
              >
                {IMPACT_CONFIG[item.metrics.impact].label}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              💡 {item.notes}
            </p>
          )}
          {item.why && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Why:</span> {item.why}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
