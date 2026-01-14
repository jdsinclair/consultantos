"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Circle,
  Plus,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Filter,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isPast, isToday, isTomorrow, addDays } from "date-fns";
import { TaskDetailDialog } from "@/components/task-detail-dialog";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner: string | null;
  ownerType: string;
  dueDate: string | null;
  completedAt: string | null;
  clientId: string;
  sessionId: string | null;
  client: { id: string; name: string } | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
}

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemClientId, setNewItemClientId] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter, clientFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (clientFilter) params.set("clientId", clientFilter);

      const [itemsRes, clientsRes] = await Promise.all([
        fetch(`/api/action-items?${params.toString()}`),
        fetch("/api/clients"),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: completed ? "completed" : "pending", completedAt: completed ? new Date().toISOString() : null }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to update action item:", error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle || !newItemClientId) return;

    setAdding(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItemTitle,
          clientId: newItemClientId,
          priority: "medium",
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [newItem, ...prev]);
        setNewItemTitle("");
      }
    } catch (error) {
      console.error("Failed to add action item:", error);
    } finally {
      setAdding(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: "Overdue", class: "text-destructive" };
    }
    if (isToday(date)) {
      return { label: "Due today", class: "text-orange-500" };
    }
    if (isTomorrow(date)) {
      return { label: "Due tomorrow", class: "text-yellow-500" };
    }
    return { label: formatDistanceToNow(date, { addSuffix: true }), class: "text-muted-foreground" };
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const overdueCount = items.filter((i) => i.status === "pending" && i.dueDate && isPast(new Date(i.dueDate)) && !isToday(new Date(i.dueDate))).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Action Items</h1>
          <p className="text-muted-foreground">
            Track commitments and follow-ups across all clients
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingCount} pending
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {overdueCount} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowClientDropdown(!showClientDropdown)}
          >
            <Users className="h-4 w-4" />
            {clientFilter
              ? clients.find((c) => c.id === clientFilter)?.name
              : "All Clients"}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showClientDropdown && (
            <div className="absolute top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10">
              <div
                className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                onClick={() => {
                  setClientFilter(null);
                  setShowClientDropdown(false);
                }}
              >
                All Clients
              </div>
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                  onClick={() => {
                    setClientFilter(client.id);
                    setShowClientDropdown(false);
                  }}
                >
                  {client.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form onSubmit={handleAddItem} className="flex gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-48"
              value={newItemClientId}
              onChange={(e) => setNewItemClientId(e.target.value)}
              required
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <Input
              placeholder="Add a new action item..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !newItemTitle || !newItemClientId}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Items List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const dueDateInfo = getDueDateInfo(item.dueDate);
            return (
              <Card
                key={item.id}
                className={`hover:border-primary/30 transition-colors cursor-pointer ${
                  item.status === "completed" ? "opacity-60" : ""
                }`}
                onClick={() => {
                  setSelectedTaskId(item.id);
                  setDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(item.id, item.status !== "completed");
                      }}
                      className="mt-1"
                    >
                      {item.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={`font-medium ${
                              item.status === "completed" ? "line-through" : ""
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={getPriorityColor(item.priority) as "default"}>
                            {item.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {item.client && (
                          <Link
                            href={`/clients/${item.client.id}`}
                            className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Users className="h-3 w-3" />
                            {item.client.name}
                          </Link>
                        )}

                        {dueDateInfo && (
                          <span className={`flex items-center gap-1 ${dueDateInfo.class}`}>
                            <Calendar className="h-3 w-3" />
                            {dueDateInfo.label}
                          </span>
                        )}

                        {item.owner && (
                          <span className="text-muted-foreground">
                            Owner: {item.owner}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {filter === "completed" ? "No completed items" : "No action items"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {filter === "pending"
              ? "Great job! You're all caught up. Action items from sessions will appear here."
              : "Action items are captured during sessions and can be added manually above."}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {items.filter((i) => i.status === "pending").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{overdueCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {items.filter((i) => i.status === "completed").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchData}
      />
    </div>
  );
}
