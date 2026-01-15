"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Map,
  Target,
  Calendar,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
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

export default function RoadmapFocusPage({ params }: { params: { id: string } }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRoadmap(data);
        if (data.swimlanes) {
          setExpandedSwimlanes(new Set(data.swimlanes.map((s: RoadmapSwimlane) => s.key)));
        }
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
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Map className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{roadmap.title}</h1>
                {roadmap.client && (
                  <p className="text-sm text-muted-foreground">
                    {roadmap.client.name}
                    {roadmap.client.company && ` · ${roadmap.client.company}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {roadmap.planningHorizon && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Planning Horizon</p>
                  <p className="font-medium flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    {roadmap.planningHorizon}
                  </p>
                </div>
              )}
              <Badge variant="outline" className={cn(
                "text-sm px-3 py-1",
                roadmap.status === "active" && "bg-green-500/20 text-green-500",
                roadmap.status === "review" && "bg-purple-500/20 text-purple-500",
                roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500"
              )}>
                {roadmap.status}
              </Badge>
              <Link href={`/methods/roadmap/${params.id}`}>
                <Button variant="ghost" size="icon" title="Back to editor">
                  <X className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Objective */}
          {roadmap.objective && (
            <div className="mt-3 flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{roadmap.objective}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Board */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Timeframe Headers */}
          <div className="grid grid-cols-[240px_1fr_1fr_1fr_1fr] gap-4">
            <div className="font-semibold text-muted-foreground text-lg">Themes</div>
            {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => (
              <div key={tf} className="text-center pb-3 border-b-2" style={{ borderColor: TIMEFRAME_CONFIG[tf].color }}>
                <div className="text-xl font-bold" style={{ color: TIMEFRAME_CONFIG[tf].color }}>
                  {TIMEFRAME_CONFIG[tf].label}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">{TIMEFRAME_CONFIG[tf].sublabel}</div>
              </div>
            ))}
          </div>

          {/* Swimlane Rows */}
          {roadmap.swimlanes?.map((swimlane) => (
            <div key={swimlane.key} className="space-y-3">
              {/* Swimlane Header */}
              <button
                className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                onClick={() => {
                  setExpandedSwimlanes(prev => {
                    const next = new Set(prev);
                    next.has(swimlane.key) ? next.delete(swimlane.key) : next.add(swimlane.key);
                    return next;
                  });
                }}
              >
                {expandedSwimlanes.has(swimlane.key) ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: swimlane.color }}
                />
                <span className="font-semibold text-lg">{swimlane.label}</span>
                <Badge variant="outline" className="ml-2">
                  {roadmap.items?.filter(i => i.swimlaneKey === swimlane.key).length || 0} items
                </Badge>
              </button>

              {/* Swimlane Grid */}
              {expandedSwimlanes.has(swimlane.key) && (
                <div className="grid grid-cols-[240px_1fr_1fr_1fr_1fr] gap-4">
                  <div /> {/* Empty cell for alignment */}
                  {(['now', 'next', 'later', 'someday'] as RoadmapTimeframe[]).map((tf) => {
                    const items = getItemsForCell(swimlane.key, tf);
                    return (
                      <div
                        key={`${swimlane.key}-${tf}`}
                        className="min-h-[120px] rounded-xl border border-muted/50 p-3 space-y-3 bg-muted/10"
                      >
                        {items.map((item) => (
                          <FocusItemCard key={item.id} item={item} />
                        ))}
                        {items.length === 0 && (
                          <div className="h-full flex items-center justify-center text-muted-foreground/50">
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
      </div>

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-4 text-center text-sm text-muted-foreground">
          {roadmap.items?.length || 0} items across {roadmap.swimlanes?.length || 0} swimlanes
          {roadmap.backlog && roadmap.backlog.length > 0 && (
            <span> · {roadmap.backlog.length} items in backlog</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Focus Item Card (clean, presentation-friendly)
function FocusItemCard({ item }: { item: RoadmapItem }) {
  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <div className="p-4 bg-background border rounded-xl shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="h-3 w-3 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: statusConfig.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base">{item.title}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
          {item.why && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Why: {item.why}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
