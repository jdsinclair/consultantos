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
  Rocket,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  ListTodo,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface ExecutionPlan {
  id: string;
  clientId: string;
  title: string;
  objective?: string;
  timeframe?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  sections?: { items: { done: boolean; children?: { done: boolean }[] }[] }[];
}

export default function DoTheThingPage() {
  const [plans, setPlans] = useState<ExecutionPlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    clientId: "",
    title: "",
    objective: "",
    timeframe: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/execution-plans").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([plansData, clientsData]) => {
        setPlans(plansData);
        setClients(clientsData.filter((c: Client & { status?: string }) => 
          !["prospect_lost", "client_cancelled"].includes(c.status || "")
        ));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreatePlan = async () => {
    if (!newPlan.clientId || !newPlan.title) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/execution-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });
      
      if (!res.ok) throw new Error("Failed to create plan");
      
      const plan = await res.json();
      setPlans([plan, ...plans]);
      setShowNewDialog(false);
      setNewPlan({ clientId: "", title: "", objective: "", timeframe: "" });
      
      // Navigate to the new plan
      window.location.href = `/methods/do-the-thing/${plan.id}`;
    } catch (error) {
      console.error("Error creating plan:", error);
    } finally {
      setCreating(false);
    }
  };

  const getProgress = (plan: ExecutionPlan) => {
    if (!plan.sections) return { done: 0, total: 0 };
    
    let done = 0;
    let total = 0;
    
    plan.sections.forEach((section) => {
      section.items?.forEach((item) => {
        total++;
        if (item.done) done++;
        item.children?.forEach((child) => {
          total++;
          if (child.done) done++;
        });
      });
    });
    
    return { done, total };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            Do The Thing™
          </h1>
          <p className="text-muted-foreground mt-1">
            Turn strategy into action. Build detailed execution plans with AI assistance.
          </p>
        </div>

        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Execution Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={newPlan.clientId}
                  onValueChange={(v) => setNewPlan({ ...newPlan, clientId: v })}
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
                <Label>Plan Title</Label>
                <Input
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="e.g., GTM Phase One Plan"
                />
              </div>

              <div className="space-y-2">
                <Label>Objective (What are we doing?)</Label>
                <Input
                  value={newPlan.objective}
                  onChange={(e) => setNewPlan({ ...newPlan, objective: e.target.value })}
                  placeholder="e.g., Programmatic expansion of network at the CEO level"
                />
              </div>

              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select
                  value={newPlan.timeframe}
                  onValueChange={(v) => setNewPlan({ ...newPlan, timeframe: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="30 days">30 days</SelectItem>
                    <SelectItem value="90 days">90 days (Quarter)</SelectItem>
                    <SelectItem value="6 months">6 months</SelectItem>
                    <SelectItem value="12 months">12 months</SelectItem>
                    <SelectItem value="Phase 1">Phase 1</SelectItem>
                    <SelectItem value="Phase 2">Phase 2</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCreatePlan} 
                disabled={creating || !newPlan.clientId || !newPlan.title}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Create Plan
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No execution plans yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first plan to turn strategy into actionable steps. 
              AI will help you break down objectives into detailed tasks.
            </p>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const progress = getProgress(plan);
            const progressPercent = progress.total > 0 
              ? Math.round((progress.done / progress.total) * 100) 
              : 0;

            return (
              <Link key={plan.id} href={`/methods/do-the-thing/${plan.id}`}>
                <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                          {plan.title}
                        </CardTitle>
                        {plan.client && (
                          <CardDescription className="mt-1">
                            {plan.client.name}
                            {plan.client.company && ` · ${plan.client.company}`}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className={getStatusColor(plan.status)}>
                        {plan.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.objective && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.objective}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {plan.timeframe && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {plan.timeframe}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(plan.updatedAt), { addSuffix: true })}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {progress.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {progress.done}/{progress.total} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-2">
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Open plan
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
