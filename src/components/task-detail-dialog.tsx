"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Calendar,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: string;
  priority: string;
  owner: string | null;
  ownerType: string;
  dueDate: string | null;
  completedAt: string | null;
  clientId: string | null;
  parentId: string | null;
  client?: { id: string; name: string } | null;
  subtasks?: ActionItem[];
}

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-700" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<ActionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [owner, setOwner] = useState("");
  const [ownerType, setOwnerType] = useState("me");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/action-items/${taskId}?includeSubtasks=true`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        // Initialize editable fields
        setTitle(data.title || "");
        setDescription(data.description || "");
        setNotes(data.notes || "");
        setPriority(data.priority || "medium");
        setOwner(data.owner || "");
        setOwnerType(data.ownerType || "me");
        setDueDate(data.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd") : "");
      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!taskId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/action-items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          notes: notes || undefined,
          priority,
          owner: owner || undefined,
          ownerType,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTask({ ...task, ...updated });
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (completed: boolean) => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/action-items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTask({ ...task, ...updated });
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to toggle task status:", error);
    }
  };

  const handleAddSubtask = async () => {
    if (!taskId || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parentId: taskId,
          clientId: task?.clientId,
          priority: "medium",
        }),
      });

      if (res.ok) {
        const newSubtask = await res.json();
        setTask({
          ...task!,
          subtasks: [...(task?.subtasks || []), newSubtask],
        });
        setNewSubtaskTitle("");
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to add subtask:", error);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/action-items/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
        }),
      });

      if (res.ok) {
        setTask({
          ...task!,
          subtasks: task?.subtasks?.map((st) =>
            st.id === subtaskId ? { ...st, status: completed ? "completed" : "pending" } : st
          ),
        });
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm("Delete this subtask?")) return;
    try {
      await fetch(`/api/action-items/${subtaskId}`, { method: "DELETE" });
      setTask({
        ...task!,
        subtasks: task?.subtasks?.filter((st) => st.id !== subtaskId),
      });
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete subtask:", error);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !confirm("Delete this task and all subtasks?")) return;
    try {
      await fetch(`/api/action-items/${taskId}`, { method: "DELETE" });
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const completedSubtasks = task?.subtasks?.filter((st) => st.status === "completed").length || 0;
  const totalSubtasks = task?.subtasks?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : task?.status === "completed" ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            Task Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : task ? (
          <div className="space-y-4 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium transition-all",
                      priority === p.value
                        ? p.color + " ring-2 ring-offset-1 ring-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Owner */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Assignee name..."
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOwnerType("me")}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm flex-1 transition-colors",
                      ownerType === "me"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    Me
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerType("client")}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm flex-1 transition-colors",
                      ownerType === "client"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    Client
                  </button>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add additional notes..."
                rows={3}
              />
            </div>

            {/* Client info */}
            {task.client && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Client: {task.client.name}</span>
              </div>
            )}

            {/* Subtasks */}
            <div className="border-t pt-4">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowSubtasks(!showSubtasks)}
              >
                <span className="font-medium flex items-center gap-2">
                  Subtasks
                  {totalSubtasks > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {completedSubtasks}/{totalSubtasks}
                    </Badge>
                  )}
                </span>
                {showSubtasks ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showSubtasks && (
                <div className="mt-3 space-y-2">
                  {/* Existing subtasks */}
                  {task.subtasks && task.subtasks.length > 0 ? (
                    task.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50 group"
                      >
                        <button
                          onClick={() =>
                            handleToggleSubtask(subtask.id, subtask.status !== "completed")
                          }
                        >
                          {subtask.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            subtask.status === "completed" && "line-through text-muted-foreground"
                          )}
                        >
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No subtasks yet</p>
                  )}

                  {/* Add subtask */}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add a subtask..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddSubtask}
                      disabled={addingSubtask || !newSubtaskTitle.trim()}
                    >
                      {addingSubtask ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(task.status !== "completed")}
                >
                  {task.status === "completed" ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Task not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
