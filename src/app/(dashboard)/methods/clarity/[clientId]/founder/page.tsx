"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Crosshair, Gauge, Skull, Shield, FileText, Layers } from "lucide-react";
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
export default function FounderViewPage({ params }: { params: { clientId: string } }) {
  const [loading, setLoading] = useState(true);
  const [canvas, setCanvas] = useState<ClarityCanvas | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchCanvas();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCanvas, 5000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canvas || !client) {
    return (
      <div className="p-8 text-center bg-background min-h-screen">
        <p className="text-muted-foreground">Canvas not found</p>
      </div>
    );
  }

  const strategicTruthEntries = Object.entries(canvas.strategicTruth || {}) as [keyof typeof STRATEGIC_TRUTH_CONFIG, { value: string; status: string }][];
  const swimlaneEntries = Object.entries(canvas.swimlanes || {}).filter(([key]) => !key.startsWith('custom_'));
  const customSwimlanes = Object.entries(canvas.swimlanes || {}).filter(([key]) => key.startsWith('custom_'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Clarity Method™</h1>
            <p className="text-muted-foreground">
              {client.name} {client.company && `· ${client.company}`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Strategic Truth */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Strategic Truth
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {strategicTruthEntries.map(([key, box]) => (
              <Card key={key} className={box.status === 'locked' ? 'border-primary/50 bg-primary/5' : ''}>
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
                    <Badge variant="secondary" className="mt-2 text-xs">Locked</Badge>
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.revenueTarget || '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Margin Floor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.marginFloor || '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Founder Role Shift</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{canvas.northStar.founderRole || '—'}</p>
                </CardContent>
              </Card>
              <Card>
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
            <Card className="border-amber-500/50 bg-amber-500/5">
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
            <Card className="border-red-500/20">
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
        {canvas.strategy && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Strategy Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {canvas.strategy.core && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Core</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.core}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.expansion && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Expansion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.expansion}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.orgShift && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Org Shift</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{canvas.strategy.orgShift}</p>
                  </CardContent>
                </Card>
              )}
              {canvas.strategy.founderRole && (
                <Card>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground w-48">Area</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    {SWIMLANE_TIMEFRAME_LABELS.short}
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    {SWIMLANE_TIMEFRAME_LABELS.mid}
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
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
                    // Legacy format support
                    (Array.isArray((lane as any)?.short) && (lane as any)?.short?.length > 0)
                  );
                  if (!hasContent) return null;
                  
                  return (
                    <tr key={key} className="border-b">
                      <td className="p-3 font-medium">{label}</td>
                      {(['short', 'mid', 'long'] as const).map((tf) => {
                        const tfData = (lane as any)?.[tf];
                        // Handle both new format (with objective) and legacy (array)
                        const items = Array.isArray(tfData) ? tfData : tfData?.items || [];
                        const objective = Array.isArray(tfData) ? '' : tfData?.objective || '';
                        
                        return (
                          <td key={tf} className="p-3 align-top">
                            {objective && (
                              <p className="text-xs font-semibold text-primary mb-2">{objective}</p>
                            )}
                            <ul className="text-sm space-y-1">
                              {items.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
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
                    <tr key={key} className="border-b bg-muted/30">
                      <td className="p-3 font-medium">{label}</td>
                      {(['short', 'mid', 'long'] as const).map((tf) => {
                        const tfData = customLane?.[tf];
                        const items = Array.isArray(tfData) ? tfData : tfData?.items || [];
                        const objective = Array.isArray(tfData) ? '' : tfData?.objective || '';
                        
                        return (
                          <td key={tf} className="p-3 align-top">
                            {objective && (
                              <p className="text-xs font-semibold text-primary mb-2">{objective}</p>
                            )}
                            <ul className="text-sm space-y-1">
                              {items.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
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
        </section>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>Clarity Method™ · Strategic Diagnosis + Execution Mapping</p>
        <p className="mt-1">Last updated: {new Date(canvas.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
