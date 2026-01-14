"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Crosshair, Gauge, Skull, Shield, FileText, Layers, RefreshCw } from "lucide-react";
import {
  ClarityCanvas,
  STRATEGIC_TRUTH_CONFIG,
  SWIMLANE_LABELS,
  SWIMLANE_TIMEFRAME_LABELS,
} from "@/lib/clarity-method/types";

interface Client {
  id: string;
  name: string;
  company?: string;
}

// This is the FOUNDER VIEW - a clean, shareable view without coach notes
// Designed to be opened in a separate window for screen sharing
// NO NAVIGATION, NO SIDEBAR - just the canvas content
export default function FounderSharePage({ params }: { params: { clientId: string } }) {
  const [loading, setLoading] = useState(true);
  const [canvas, setCanvas] = useState<ClarityCanvas | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchCanvas = useCallback(async () => {
    try {
      const res = await fetch(`/api/clarity-method/${params.clientId}`);
      if (!res.ok) throw new Error("Failed to fetch canvas");
      const data = await res.json();
      setCanvas(data.canvas);
      setClient(data.client);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching canvas:", error);
    } finally {
      setLoading(false);
    }
  }, [params.clientId]);

  useEffect(() => {
    fetchCanvas();
    // Poll for updates every 2 seconds for real-time feel
    const interval = setInterval(fetchCanvas, 2000);
    return () => clearInterval(interval);
  }, [fetchCanvas]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (!canvas || !client) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Canvas not found</p>
          <p className="text-muted-foreground mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const strategicTruthEntries = Object.entries(canvas.strategicTruth || {}) as [keyof typeof STRATEGIC_TRUTH_CONFIG, { value: string; status: string }][];
  const swimlaneEntries = Object.entries(canvas.swimlanes || {}).filter(([key]) => !key.startsWith('custom_'));
  const customSwimlanes = Object.entries(canvas.swimlanes || {}).filter(([key]) => key.startsWith('custom_'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Clarity Method™</h1>
                <p className="text-sm text-muted-foreground">
                  {client.name} {client.company && `· ${client.company}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Live · Updated {lastUpdated}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Strategic Truth */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Strategic Truth
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {strategicTruthEntries.map(([key, box]) => (
              <Card key={key} className={box.status === 'locked' ? 'border-primary/50 bg-primary/5 shadow-sm' : 'shadow-sm'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {STRATEGIC_TRUTH_CONFIG[key]?.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {box.value || <span className="text-muted-foreground italic">Not yet defined</span>}
                  </p>
                  {box.status === 'locked' && (
                    <Badge variant="secondary" className="mt-2 text-xs">✓ Locked</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* North Star */}
        {canvas.northStar && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-blue-500" />
              North Star Constraints
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.revenueTarget || '—'}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Margin Floor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.marginFloor || '—'}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Founder Role Shift</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.founderRole || '—'}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Complexity Ceiling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.complexityCeiling || '—'}</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Core Engine - Primary Constraint */}
        {canvas.coreEngine?.primaryConstraint && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-amber-500" />
              Primary Constraint
            </h2>
            <Card className="border-amber-500/50 bg-amber-500/5 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-lg font-semibold">{canvas.coreEngine.primaryConstraint}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Kill List */}
        {canvas.killList && canvas.killList.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-500" />
              Kill List
            </h2>
            <Card className="border-red-500/20 shadow-sm">
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {canvas.killList.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 font-bold">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Strategy */}
        {canvas.strategy && (canvas.strategy.core || canvas.strategy.expansion || canvas.strategy.orgShift || canvas.strategy.founderRole) && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Strategy Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {canvas.strategy.core && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Core</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.core}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.expansion && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Expansion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.expansion}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.orgShift && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Org Shift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.orgShift}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.founderRole && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Founder Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.founderRole}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Execution Swimlanes */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-green-500" />
            Execution Swimlanes
          </h2>
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground w-48">Area</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      {SWIMLANE_TIMEFRAME_LABELS.short}
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      {SWIMLANE_TIMEFRAME_LABELS.mid}
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      {SWIMLANE_TIMEFRAME_LABELS.long}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {swimlaneEntries.map(([key, lane]) => {
                    const label = SWIMLANE_LABELS[key as keyof typeof SWIMLANE_LABELS] || key;
                    const hasContent = (
                      (lane as any)?.short?.items?.length > 0 ||
                      (lane as any)?.mid?.items?.length > 0 ||
                      (lane as any)?.long?.items?.length > 0 ||
                      (lane as any)?.short?.objective ||
                      (lane as any)?.mid?.objective ||
                      (lane as any)?.long?.objective ||
                      // Legacy format support
                      (Array.isArray((lane as any)?.short) && (lane as any)?.short?.length > 0)
                    );
                    if (!hasContent) return null;
                    
                    return (
                      <tr key={key} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{label}</td>
                        {(['short', 'mid', 'long'] as const).map((tf) => {
                          const tfData = (lane as any)?.[tf];
                          // Handle both new format (with objective) and legacy (array)
                          const items = Array.isArray(tfData) ? tfData : tfData?.items || [];
                          const objective = Array.isArray(tfData) ? '' : tfData?.objective || '';
                          
                          return (
                            <td key={tf} className="p-4 align-top">
                              {objective && (
                                <p className="text-xs font-semibold text-primary mb-2 pb-2 border-b border-primary/20">{objective}</p>
                              )}
                              <ul className="text-sm space-y-1">
                                {items.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Custom swimlanes */}
                  {customSwimlanes.map(([key, lane]) => {
                    const customLane = lane as any;
                    const label = customLane?.label || key.replace('custom_', '');
                    
                    return (
                      <tr key={key} className="border-b bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors">
                        <td className="p-4 font-medium flex items-center gap-2">
                          {label}
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        </td>
                        {(['short', 'mid', 'long'] as const).map((tf) => {
                          const tfData = customLane?.[tf];
                          const items = Array.isArray(tfData) ? tfData : tfData?.items || [];
                          const objective = Array.isArray(tfData) ? '' : tfData?.objective || '';
                          
                          return (
                            <td key={tf} className="p-4 align-top">
                              {objective && (
                                <p className="text-xs font-semibold text-primary mb-2 pb-2 border-b border-primary/20">{objective}</p>
                              )}
                              <ul className="text-sm space-y-1">
                                {items.map((item: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">Clarity Method™</p>
          <p className="text-xs text-muted-foreground mt-1">Strategic Diagnosis + Execution Mapping</p>
        </div>
      </footer>
    </div>
  );
}
