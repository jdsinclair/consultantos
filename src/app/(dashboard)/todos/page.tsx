"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TodoQuickAdd } from "@/components/todo-quick-add";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Sparkles,
  FileText,
  Mic,
  Mail,
  Search,
  Filter,
  Loader2,
  MoreHorizontal,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, isPast, format } from "date-fns";
import { cn } from "@/lib/utils";

type ActionItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  ownerType: string;
  owner?: string;
  dueDate?: string;
  source: string;
  sourceContext?: string;
  completedAt?: string;
  createdAt: string;
  client?: { id: string; name: string; color?: string };
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const sourceIcons: Record<string, React.ReactNode> = {
  detected: <Sparkles className="h-3 w-3" />,
  note: <FileText className="h-3 w-3" />,
  transcript: <Mic className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
};

const sourceLabels: Record<string, string> = {
  detected: "AI Detected",
  note: "From Note",
  transcript: "From Call",
  email: "From Email",
  manual: "Manual",
};

export default function TodosPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "pending",
    priority: "all",
    clientId: "all",
    ownerType: "all",
    search: "",
  });

  useEffect(() => {
    fetchItems();
    fetchClients();
  }, [filter.status, filter.clientId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status && filter.status !== "all") {
        params.set("status", filter.status);
      }
      if (filter.clientId && filter.clientId !== "all") {
        params.set("clientId", filter.clientId);
      }

      const res = await fetch(`/api/action-items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch action items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      if (res.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error("Failed to complete item:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleItemAdded = (item: unknown) => {
    fetchItems();
  };

  // Apply client-side filters
  const filteredItems = items.filter((item) => {
    if (filter.priority !== "all" && item.priority !== filter.priority) {
      return false;
    }
    if (filter.ownerType !== "all" && item.ownerType !== filter.ownerType) {
      return false;
    }
    if (
      filter.search &&
      !item.title.toLowerCase().includes(filter.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Group items
  const overdueItems = filteredItems.filter(
    (i) => i.dueDate && isPast(new Date(i.dueDate)) && i.status === "pending"
  );
  const todayItems = filteredItems.filter((i) => {
    if (!i.dueDate || i.status !== "pending") return false;
    const due = new Date(i.dueDate);
    const today = new Date();
    return (
      due.getDate() === today.getDate() &&
      due.getMonth() === today.getMonth() &&
      due.getFullYear() === today.getFullYear()
    );
  });
  const upcomingItems = filteredItems.filter((i) => {
    if (overdueItems.includes(i) || todayItems.includes(i)) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Action Items</h1>
          <p className="text-muted-foreground">
            Track tasks, commitments, and follow-ups
          </p>
        </div>
      </div>

      {/* Quick Add */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <TodoQuickAdd
            clients={clients}
            showClientSelector
            onAdd={handleItemAdded}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filter.status}
          onValueChange={(v: string) => setFilter({ ...filter, status: v })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.priority}
          onValueChange={(v: string) => setFilter({ ...filter, priority: v })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.clientId}
          onValueChange={(v: string) => setFilter({ ...filter, clientId: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.ownerType}
          onValueChange={(v: string) => setFilter({ ...filter, ownerType: v })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            <SelectItem value="me">My Tasks</SelectItem>
            <SelectItem value="client">Client Tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No action items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueItems.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue ({overdueItems.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  {overdueItems.map((item) => (
                    <TodoItem
                      key={item.id}
                      item={item}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Today */}
          {todayItems.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due Today ({todayItems.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  {todayItems.map((item) => (
                    <TodoItem
                      key={item.id}
                      item={item}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* All/Upcoming */}
          {upcomingItems.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {filter.status === "completed" ? "Completed" : "All Tasks"} (
                {upcomingItems.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  {upcomingItems.map((item) => (
                    <TodoItem
                      key={item.id}
                      item={item}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodoItem({
  item,
  onComplete,
  onDelete,
}: {
  item: ActionItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isCompleted = item.status === "completed";
  const isOverdue =
    item.dueDate && isPast(new Date(item.dueDate)) && !isCompleted;

  return (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <button
        onClick={() => !isCompleted && onComplete(item.id)}
        className={cn(
          "mt-0.5 rounded-full transition-colors",
          isCompleted
            ? "text-green-600"
            : "text-muted-foreground hover:text-primary"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className={cn(
              "font-medium",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {item.title}
          </span>

          {/* Priority Badge */}
          <Badge
            variant="secondary"
            className={cn("text-xs", priorityColors[item.priority])}
          >
            {item.priority}
          </Badge>

          {/* Source Badge */}
          {item.source !== "manual" && (
            <Badge
              variant="outline"
              className="text-xs gap-1 text-muted-foreground"
            >
              {sourceIcons[item.source]}
              {sourceLabels[item.source]}
            </Badge>
          )}

          {/* Owner Badge */}
          {item.ownerType === "client" && (
            <Badge variant="outline" className="text-xs">
              Client
            </Badge>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {/* Client */}
          {item.client && (
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.client.color || "#888" }}
              />
              {item.client.name}
            </span>
          )}

          {/* Due Date */}
          {item.dueDate && (
            <span
              className={cn(
                "flex items-center gap-1",
                isOverdue && "text-red-600"
              )}
            >
              <Calendar className="h-3 w-3" />
              {isOverdue
                ? `${formatDistanceToNow(new Date(item.dueDate))} overdue`
                : format(new Date(item.dueDate), "MMM d")}
            </span>
          )}

          {/* Source Context */}
          {item.sourceContext && (
            <span className="truncate max-w-[200px] italic">
              "{item.sourceContext}"
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
