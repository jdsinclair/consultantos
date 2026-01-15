"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Map,
  Target,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  Layers,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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
  planningHorizon?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  items?: { id: string }[];
  backlog?: { id: string }[];
  swimlanes?: { key: string }[];
}

export default function RoadmapListPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoadmap, setNewRoadmap] = useState({
    clientId: "",
    title: "Product Roadmap",
    objective: "",
    planningHorizon: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/roadmaps").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([roadmapsData, clientsData]) => {
        setRoadmaps(roadmapsData);
        setClients(clientsData.filter((c: Client & { status?: string }) =>
          !["prospect_lost", "client_cancelled"].includes(c.status || "")
        ));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateRoadmap = async () => {
    if (!newRoadmap.clientId || !newRoadmap.title) return;

    setCreating(true);
    try {
      const res = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoadmap),
      });

      if (!res.ok) throw new Error("Failed to create roadmap");

      const roadmap = await res.json();
      setRoadmaps([roadmap, ...roadmaps]);
      setShowNewDialog(false);
      setNewRoadmap({ clientId: "", title: "Product Roadmap", objective: "", planningHorizon: "" });

      // Navigate to the new roadmap
      window.location.href = `/methods/roadmap/${roadmap.id}`;
    } catch (error) {
      console.error("Error creating roadmap:", error);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "review":
        return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      case "archived":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Map className="h-5 w-5 text-white" />
            </div>
            Roadmap Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual directional roadmaps. Dump ideas, organize by theme, align on priorities.
          </p>
        </div>

        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              <Plus className="h-4 w-4" />
              New Roadmap
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Roadmap</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={newRoadmap.clientId}
                  onValueChange={(v) => setNewRoadmap({ ...newRoadmap, clientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company && `(${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Roadmap Title</Label>
                <Input
                  value={newRoadmap.title}
                  onChange={(e) => setNewRoadmap({ ...newRoadmap, title: e.target.value })}
                  placeholder="e.g., Product Roadmap 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Objective (What are we building towards?)</Label>
                <Input
                  value={newRoadmap.objective}
                  onChange={(e) => setNewRoadmap({ ...newRoadmap, objective: e.target.value })}
                  placeholder="e.g., Launch self-serve tier with 10x onboarding"
                />
              </div>

              <div className="space-y-2">
                <Label>Planning Horizon</Label>
                <Select
                  value={newRoadmap.planningHorizon}
                  onValueChange={(v) => setNewRoadmap({ ...newRoadmap, planningHorizon: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                    <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                    <SelectItem value="H1 2026">H1 2026</SelectItem>
                    <SelectItem value="H2 2026">H2 2026</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="6 months">Next 6 months</SelectItem>
                    <SelectItem value="12 months">Next 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateRoadmap}
                disabled={creating || !newRoadmap.clientId || !newRoadmap.title}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4 mr-2" />
                    Create Roadmap
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roadmaps Grid */}
      {roadmaps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No roadmaps yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first roadmap to visualize and organize product direction.
              Dump ideas, organize by theme, and align on priorities.
            </p>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Roadmap
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => {
            const itemCount = roadmap.items?.length || 0;
            const backlogCount = roadmap.backlog?.length || 0;
            const swimlaneCount = roadmap.swimlanes?.length || 0;

            return (
              <Link key={roadmap.id} href={`/methods/roadmap/${roadmap.id}`}>
                <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {roadmap.title}
                        </CardTitle>
                        {roadmap.client && (
                          <CardDescription className="mt-1">
                            {roadmap.client.name}
                            {roadmap.client.company && ` · ${roadmap.client.company}`}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className={getStatusColor(roadmap.status)}>
                        {roadmap.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {roadmap.objective && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {roadmap.objective}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {roadmap.planningHorizon && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {roadmap.planningHorizon}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(roadmap.updatedAt), { addSuffix: true })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full">
                        <Layers className="h-3 w-3" />
                        {swimlaneCount} lanes
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
                        <Target className="h-3 w-3" />
                        {itemCount} items
                      </div>
                      {backlogCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full">
                          +{backlogCount} backlog
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Open roadmap
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
