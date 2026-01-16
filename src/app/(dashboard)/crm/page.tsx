"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  DollarSign,
  ExternalLink,
  GripVertical,
  Plus,
  Building2,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useDealMode } from "@/contexts/deal-mode";
import { formatDealValue } from "@/components/deal-badge";

interface CRMClient {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  status: string;
  dealValue: number | null;
  dealStatus: string | null;
  viewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define the pipeline stages/swimlanes
const STAGES = [
  { key: "prospect", label: "Prospects", color: "bg-blue-500" },
  { key: "active", label: "Active Clients", color: "bg-green-500" },
  { key: "paused", label: "Paused", color: "bg-yellow-500" },
  { key: "completed", label: "Completed", color: "bg-gray-500" },
  { key: "prospect_lost", label: "Lost", color: "bg-red-500" },
];

const dealStatusLabels: Record<string, string> = {
  none: "No Quote",
  placeholder: "Thinking",
  presented: "Presented",
  active: "Active",
};

export default function CRMPage() {
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedClient, setDraggedClient] = useState<CRMClient | null>(null);
  const [editingDeal, setEditingDeal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { dealModeEnabled } = useDealMode();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/crm");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getClientsByStage = (stage: string) => {
    return clients.filter((c) => c.status === stage);
  };

  const getTotalValue = (stage: string) => {
    return clients
      .filter((c) => c.status === stage)
      .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  };

  const handleDragStart = (client: CRMClient) => {
    setDraggedClient(client);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStage: string) => {
    if (!draggedClient || draggedClient.status === targetStage) {
      setDraggedClient(null);
      return;
    }

    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        c.id === draggedClient.id ? { ...c, status: targetStage } : c
      )
    );

    try {
      await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: draggedClient.id,
          status: targetStage,
        }),
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on error
      fetchClients();
    }

    setDraggedClient(null);
  };

  const handleDealValueSave = async (clientId: string) => {
    const valueInCents = Math.round(parseFloat(editValue || "0") * 100);

    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, dealValue: valueInCents } : c
      )
    );

    try {
      await fetch("/api/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          dealValue: valueInCents,
        }),
      });
    } catch (error) {
      console.error("Failed to update deal value:", error);
      fetchClients();
    }

    setEditingDeal(null);
    setEditValue("");
  };

  const startEditingDeal = (client: CRMClient) => {
    setEditingDeal(client.id);
    setEditValue(client.dealValue ? (client.dealValue / 100).toString() : "");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pipeline</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Drag cards between stages to update status
          </p>
        </div>
        <Link href="/prospects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Prospect
          </Button>
        </Link>
      </div>

      {/* Swimlanes */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {STAGES.map((stage) => {
            const stageClients = getClientsByStage(stage.key);
            const totalValue = getTotalValue(stage.key);

            return (
              <div
                key={stage.key}
                className={cn(
                  "w-72 flex-shrink-0 flex flex-col rounded-lg border bg-muted/30",
                  draggedClient && "border-dashed"
                )}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Stage Header */}
                <div className="p-3 border-b bg-background rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                      <h3 className="font-semibold text-sm">{stage.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {stageClients.length}
                      </Badge>
                    </div>
                  </div>
                  {dealModeEnabled && totalValue > 0 && (
                    <div className="mt-1 text-xs text-green-600 font-medium">
                      {formatDealValue(totalValue)}
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {stageClients.map((client) => (
                    <Card
                      key={client.id}
                      draggable
                      onDragStart={() => handleDragStart(client)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all",
                        draggedClient?.id === client.id && "opacity-50",
                        !client.viewedAt && "ring-2 ring-blue-500 ring-offset-1"
                      )}
                    >
                      <CardContent className="p-3">
                        {/* Name & New Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">
                              {client.name}
                            </span>
                          </div>
                          {!client.viewedAt && (
                            <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">
                              NEW
                            </Badge>
                          )}
                        </div>

                        {/* Company */}
                        {client.company && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{client.company}</span>
                          </div>
                        )}

                        {/* Email */}
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}

                        {/* Deal Value (editable) */}
                        {dealModeEnabled && (
                          <div className="mb-2">
                            {editingDeal === client.id ? (
                              <div className="flex gap-1">
                                <div className="relative flex-1">
                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleDealValueSave(client.id);
                                      if (e.key === "Escape") setEditingDeal(null);
                                    }}
                                    className="h-7 text-xs pl-6"
                                    autoFocus
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleDealValueSave(client.id)}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingDeal(client)}
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                              >
                                <DollarSign className="h-3 w-3" />
                                {client.dealValue
                                  ? formatDealValue(client.dealValue)
                                  : "Set value"}
                                <span className="text-muted-foreground ml-1">
                                  ({dealStatusLabels[client.dealStatus || "none"]})
                                </span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(client.updatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <Link
                            href={
                              client.status === "prospect"
                                ? `/prospects/${client.id}`
                                : `/clients/${client.id}`
                            }
                          >
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {stageClients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Drop cards here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <Card className="mt-4 bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 py-4">
          <Sparkles className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Webhook Integration:</span>{" "}
            <span className="text-muted-foreground">
              Prospects from Zapier are marked as &ldquo;NEW&rdquo; until viewed. Toggle $ mode in sidebar to see/edit deal values.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
