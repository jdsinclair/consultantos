"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  text: string;
  done: boolean;
  children?: PlanItem[];
  order: number;
  assignee?: string;
  dueDate?: string;
  notes?: string;
  priority?: "now" | "next" | "later";
  blockedBy?: string;
}

interface PlanSection {
  id: string;
  title: string;
  objective?: string;
  goal?: string;
  successMetrics?: {
    quantitative: string[];
    qualitative: string[];
  };
  rules?: string[];
  why?: string;
  what?: string;
  notes?: string;
  status?: "draft" | "active" | "completed" | "backlog";
  items: PlanItem[];
  order: number;
  collapsed?: boolean;
}

interface FocusViewProps {
  sections: PlanSection[];
  onUpdateSection: (sectionId: string, updates: Partial<PlanSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSection: () => void;
  onUpdateItem: (
    sectionId: string,
    itemId: string,
    updates: Partial<PlanItem>
  ) => void;
  onDeleteItem: (sectionId: string, itemId: string) => void;
  onAddItem: (sectionId: string, parentId?: string) => void;
}

export function FocusView({
  sections,
  onUpdateSection,
  onDeleteSection,
  onAddSection,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: FocusViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newItemText, setNewItemText] = useState<{ [sectionId: string]: string }>({});

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Toggle item expansion (for items with children)
  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Calculate progress for a section
  const getSectionProgress = (section: PlanSection) => {
    let done = 0;
    let total = 0;
    const countItems = (items: PlanItem[]) => {
      items.forEach((item) => {
        total++;
        if (item.done) done++;
        if (item.children) countItems(item.children);
      });
    };
    countItems(section.items);
    return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  // Handle adding new item with Enter key
  const handleNewItemKeyDown = (sectionId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newItemText[sectionId]?.trim()) {
      onAddItem(sectionId);
      // The item will be added empty, then we'll update it
      // For now, clear the input - the actual implementation uses the addItem function
      setNewItemText((prev) => ({ ...prev, [sectionId]: "" }));
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Table Header */}
      <div className="grid grid-cols-[32px_1fr_100px_100px_80px_80px_40px] gap-0 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
        <div className="p-2"></div>
        <div className="p-2 border-l">Task</div>
        <div className="p-2 border-l text-center">Assignee</div>
        <div className="p-2 border-l text-center">Due</div>
        <div className="p-2 border-l text-center">Priority</div>
        <div className="p-2 border-l text-center">Status</div>
        <div className="p-2 border-l"></div>
      </div>

      {/* Table Body */}
      <div className="divide-y">
        {sections.map((section) => (
          <div key={section.id}>
            {/* Initiative Row */}
            <div
              className={cn(
                "grid grid-cols-[32px_1fr_100px_100px_80px_80px_40px] gap-0 bg-muted/30 hover:bg-muted/50 transition-colors group",
                section.status === "active" && "border-l-2 border-l-green-500",
                section.status === "draft" && "border-l-2 border-l-yellow-500",
                section.status === "completed" && "border-l-2 border-l-blue-500",
                section.status === "backlog" && "border-l-2 border-l-gray-400"
              )}
            >
              <div className="p-2 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => toggleSection(section.id)}
                >
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="p-2 border-l">
                <div className="flex items-center gap-2">
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      onUpdateSection(section.id, { title: e.target.value })
                    }
                    className="font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm"
                    placeholder="Initiative name..."
                  />
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {getSectionProgress(section).done}/{getSectionProgress(section).total}
                  </Badge>
                </div>
              </div>
              <div className="p-2 border-l"></div>
              <div className="p-2 border-l"></div>
              <div className="p-2 border-l"></div>
              <div className="p-2 border-l">
                <Select
                  value={section.status || "draft"}
                  onValueChange={(value: "draft" | "active" | "completed" | "backlog") =>
                    onUpdateSection(section.id, { status: value })
                  }
                >
                  <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="completed">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2 border-l flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteSection(section.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Items for this initiative */}
            {expandedSections.has(section.id) && (
              <>
                {section.items.map((item) => (
                  <FocusViewItemRow
                    key={item.id}
                    item={item}
                    sectionId={section.id}
                    depth={0}
                    expandedItems={expandedItems}
                    onToggle={() => toggleItem(item.id)}
                    onUpdate={(itemId, updates) => onUpdateItem(section.id, itemId, updates)}
                    onDelete={(itemId) => onDeleteItem(section.id, itemId)}
                    onAddChild={(parentId) => onAddItem(section.id, parentId)}
                    onAddSibling={() => onAddItem(section.id)}
                  />
                ))}
                {/* Add item row */}
                <AddItemRow
                  sectionId={section.id}
                  depth={0}
                  onAdd={() => onAddItem(section.id)}
                />
              </>
            )}
          </div>
        ))}

        {/* Add Initiative Row */}
        <div className="grid grid-cols-[32px_1fr_100px_100px_80px_80px_40px] gap-0 hover:bg-muted/30 transition-colors">
          <div className="p-2"></div>
          <div className="p-2 border-l">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground -ml-2"
              onClick={onAddSection}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add initiative
            </Button>
          </div>
          <div className="p-2 border-l"></div>
          <div className="p-2 border-l"></div>
          <div className="p-2 border-l"></div>
          <div className="p-2 border-l"></div>
          <div className="p-2 border-l"></div>
        </div>
      </div>
    </div>
  );
}

// Add item row component
function AddItemRow({
  sectionId,
  depth,
  onAdd,
}: {
  sectionId: string;
  depth: number;
  onAdd: () => void;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr_100px_100px_80px_80px_40px] gap-0 hover:bg-muted/30 transition-colors">
      <div className="p-2"></div>
      <div className="p-2 border-l" style={{ paddingLeft: 8 + depth * 20 + 28 }}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground -ml-2"
          onClick={onAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add task
        </Button>
      </div>
      <div className="p-2 border-l"></div>
      <div className="p-2 border-l"></div>
      <div className="p-2 border-l"></div>
      <div className="p-2 border-l"></div>
      <div className="p-2 border-l"></div>
    </div>
  );
}

// Individual item row component
function FocusViewItemRow({
  item,
  sectionId,
  depth,
  expandedItems,
  onToggle,
  onUpdate,
  onDelete,
  onAddChild,
  onAddSibling,
}: {
  item: PlanItem;
  sectionId: string;
  depth: number;
  expandedItems: Set<string>;
  onToggle: () => void;
  onUpdate: (itemId: string, updates: Partial<PlanItem>) => void;
  onDelete: (itemId: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id) || !hasChildren;
  const inputRef = useRef<HTMLInputElement>(null);
  const [localText, setLocalText] = useState(item.text);
  const [isEditing, setIsEditing] = useState(false);

  // Sync local text with prop
  useEffect(() => {
    setLocalText(item.text);
  }, [item.text]);

  // Focus on new empty items
  useEffect(() => {
    if (!item.text && inputRef.current) {
      inputRef.current.focus();
    }
  }, [item.text]);

  const handleTextBlur = () => {
    if (localText !== item.text) {
      onUpdate(item.id, { text: localText });
    }
    setIsEditing(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTextBlur();
      // Add new sibling item after current
      onAddSibling();
    }
    if (e.key === "Escape") {
      setLocalText(item.text);
      setIsEditing(false);
    }
    if (e.key === "Tab" && !e.shiftKey) {
      // Tab to indent (add as child)
      e.preventDefault();
      handleTextBlur();
    }
    // Backspace on empty item to delete
    if (e.key === "Backspace" && !localText) {
      e.preventDefault();
      onDelete(item.id);
    }
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[32px_1fr_100px_100px_80px_80px_40px] gap-0 hover:bg-muted/20 transition-colors group",
          item.done && "opacity-60"
        )}
      >
        <div className="p-2 flex items-center justify-center">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}
        </div>
        <div
          className="p-2 border-l flex items-center gap-2"
          style={{ paddingLeft: 8 + depth * 20 }}
        >
          <Checkbox
            checked={item.done}
            onCheckedChange={(checked) => onUpdate(item.id, { done: !!checked })}
            className="shrink-0"
          />
          <Input
            ref={inputRef}
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={handleTextKeyDown}
            onFocus={() => setIsEditing(true)}
            className={cn(
              "border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm flex-1",
              item.done && "line-through text-muted-foreground"
            )}
            placeholder="Task description..."
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={() => onAddChild(item.id)}
            title="Add subtask"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="p-2 border-l">
          <Input
            value={item.assignee || ""}
            onChange={(e) => onUpdate(item.id, { assignee: e.target.value })}
            className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-xs text-center"
            placeholder="—"
          />
        </div>
        <div className="p-2 border-l">
          <Input
            type="date"
            value={item.dueDate || ""}
            onChange={(e) => onUpdate(item.id, { dueDate: e.target.value })}
            className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-xs text-center [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
          />
        </div>
        <div className="p-2 border-l">
          <Select
            value={item.priority || "none"}
            onValueChange={(value) =>
              onUpdate(item.id, { priority: value === "none" ? undefined : (value as "now" | "next" | "later") })
            }
          >
            <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="now">Now</SelectItem>
              <SelectItem value="next">Next</SelectItem>
              <SelectItem value="later">Later</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="p-2 border-l flex items-center justify-center">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 h-5 cursor-pointer",
              item.done
                ? "bg-green-500/20 text-green-600 border-green-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => onUpdate(item.id, { done: !item.done })}
          >
            {item.done ? "Done" : "Todo"}
          </Badge>
        </div>
        <div className="p-2 border-l flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Render children recursively */}
      {isExpanded && hasChildren &&
        item.children!.map((child) => (
          <FocusViewItemRow
            key={child.id}
            item={child}
            sectionId={sectionId}
            depth={depth + 1}
            expandedItems={expandedItems}
            onToggle={() => {}}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onAddSibling={() => onAddChild(item.id)}
          />
        ))}
    </>
  );
}
