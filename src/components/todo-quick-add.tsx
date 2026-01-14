"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Loader2,
  CalendarIcon,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TodoQuickAddProps {
  clientId?: string;
  clients?: Array<{ id: string; name: string }>;
  onAdd?: (item: unknown) => void;
  className?: string;
  placeholder?: string;
  showClientSelector?: boolean;
  compact?: boolean;
}

type Mode = "single" | "bulk" | "ai";

export function TodoQuickAdd({
  clientId: defaultClientId,
  clients = [],
  onAdd,
  className,
  placeholder = "Add a task...",
  showClientSelector = false,
  compact = false,
}: TodoQuickAddProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [title, setTitle] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [clientId, setClientId] = useState<string | undefined>(defaultClientId);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when defaultClientId changes
  useEffect(() => {
    setClientId(defaultClientId);
  }, [defaultClientId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (mode === "single" && !title.trim()) return;
    if ((mode === "bulk" || mode === "ai") && !bulkText.trim()) return;

    setLoading(true);

    try {
      if (mode === "single") {
        // Single item creation
        const res = await fetch("/api/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            priority,
            dueDate: dueDate?.toISOString(),
            clientId,
          }),
        });

        if (res.ok) {
          const item = await res.json();
          onAdd?.(item);
          setTitle("");
          setDueDate(undefined);
          setPriority("medium");
          setExpanded(false);
        }
      } else {
        // Bulk or AI extraction
        const res = await fetch("/api/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: mode === "ai" ? "extract" : "bulk-parse",
            text: bulkText.trim(),
            clientId,
            useAI: mode === "ai",
          }),
        });

        if (res.ok) {
          const { items } = await res.json();
          items.forEach((item: unknown) => onAdd?.(item));
          setBulkText("");
          setMode("single");
          setExpanded(false);
        }
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && mode === "single") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (compact && !expanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-2", className)}
        onClick={() => {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Plus className="h-4 w-4" />
        Add Task
      </Button>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Selector */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            className={cn(
              "px-3 py-1 text-xs transition-colors",
              mode === "single"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => setMode("single")}
          >
            Single
          </button>
          <button
            type="button"
            className={cn(
              "px-3 py-1 text-xs transition-colors border-l",
              mode === "bulk"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => setMode("bulk")}
          >
            Bulk
          </button>
          <button
            type="button"
            className={cn(
              "px-3 py-1 text-xs transition-colors border-l flex items-center gap-1",
              mode === "ai"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => setMode("ai")}
          >
            <Sparkles className="h-3 w-3" />
            AI
          </button>
        </div>

        {compact && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => setExpanded(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "single" ? (
          <>
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* Priority */}
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              {/* Due Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs justify-start",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dueDate ? format(dueDate, "MMM d") : "Due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Client Selector */}
              {showClientSelector && clients.length > 0 && (
                <Select
                  value={clientId || "none"}
                  onValueChange={(v: string) => setClientId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={loading || !title.trim()}
                className="h-8 ml-auto"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span className="ml-1">Add</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Textarea
              placeholder={
                mode === "ai"
                  ? "Paste meeting notes, emails, or any text... AI will extract action items"
                  : "Enter tasks, one per line..."
              }
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              disabled={loading}
              rows={5}
              className="resize-none"
            />

            <div className="flex items-center gap-2">
              {showClientSelector && clients.length > 0 && (
                <Select
                  value={clientId || "none"}
                  onValueChange={(v: string) => setClientId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={loading || !bulkText.trim()}
                className="h-8 ml-auto"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : mode === "ai" ? (
                  <Sparkles className="h-3 w-3 mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                {mode === "ai" ? "Extract Tasks" : "Add All"}
              </Button>
            </div>

            {mode === "ai" && (
              <p className="text-xs text-muted-foreground">
                AI will identify action items, assignees, priorities, and due dates
              </p>
            )}
          </>
        )}
      </form>
    </div>
  );
}
