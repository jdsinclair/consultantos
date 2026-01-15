"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
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
  why?: string;
  what?: string;
  notes?: string;
  status?: string;
  items: PlanItem[];
  order: number;
}

interface FocusViewReadonlyProps {
  sections: PlanSection[];
  className?: string;
}

export function FocusViewReadonly({ sections, className }: FocusViewReadonlyProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

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

  // Normalize status for display
  const normalizeStatus = (status?: string) => {
    if (!status) return "active";
    if (status === "in_progress") return "active";
    if (status === "done") return "completed";
    if (status === "not_started") return "draft";
    return status;
  };

  const getStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "active": return "Active";
      case "draft": return "Draft";
      case "completed": return "Done";
      case "backlog": return "Backlog";
      default: return status || "Active";
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background print:border-2", className)}>
      {/* Table Header */}
      <div className="grid grid-cols-[32px_1fr_100px_100px_80px_80px] gap-0 bg-muted/50 border-b text-xs font-medium text-muted-foreground print:bg-gray-100">
        <div className="p-2 print:hidden"></div>
        <div className="p-2 border-l">Task</div>
        <div className="p-2 border-l text-center">Assignee</div>
        <div className="p-2 border-l text-center">Due</div>
        <div className="p-2 border-l text-center">Priority</div>
        <div className="p-2 border-l text-center">Status</div>
      </div>

      {/* Table Body */}
      <div className="divide-y">
        {sections.map((section) => {
          const normalized = normalizeStatus(section.status);
          return (
            <div key={section.id} className="print:break-inside-avoid">
              {/* Initiative Row */}
              <div
                className={cn(
                  "grid grid-cols-[32px_1fr_100px_100px_80px_80px] gap-0 bg-muted/30 print:bg-gray-50",
                  normalized === "active" && "border-l-2 border-l-green-500",
                  normalized === "draft" && "border-l-2 border-l-yellow-500",
                  normalized === "completed" && "border-l-2 border-l-blue-500",
                  normalized === "backlog" && "border-l-2 border-l-gray-400"
                )}
              >
                <div className="p-2 flex items-center justify-center print:hidden">
                  <button
                    className="h-5 w-5 flex items-center justify-center"
                    onClick={() => toggleSection(section.id)}
                  >
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="p-2 border-l">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{section.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {getSectionProgress(section).done}/{getSectionProgress(section).total}
                    </Badge>
                  </div>
                </div>
                <div className="p-2 border-l"></div>
                <div className="p-2 border-l"></div>
                <div className="p-2 border-l"></div>
                <div className="p-2 border-l text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      normalized === "active" && "bg-green-500/20 text-green-600",
                      normalized === "draft" && "bg-yellow-500/20 text-yellow-600",
                      normalized === "completed" && "bg-blue-500/20 text-blue-600",
                      normalized === "backlog" && "bg-gray-500/20 text-gray-600"
                    )}
                  >
                    {getStatusLabel(section.status)}
                  </Badge>
                </div>
              </div>

              {/* Items - always shown in print, toggle on screen */}
              <div className={cn(
                !expandedSections.has(section.id) && "hidden print:block"
              )}>
                {section.items.map((item) => (
                  <ReadonlyItemRow key={item.id} item={item} depth={0} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadonlyItemRow({ item, depth }: { item: PlanItem; depth: number }) {
  const hasChildren = item.children && item.children.length > 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[32px_1fr_100px_100px_80px_80px] gap-0 print:break-inside-avoid",
          item.done && "opacity-60"
        )}
      >
        <div className="p-2 flex items-center justify-center print:hidden">
          {hasChildren && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div
          className="p-2 border-l flex items-center gap-2"
          style={{ paddingLeft: 8 + depth * 20 }}
        >
          <Checkbox checked={item.done} disabled className="shrink-0 cursor-default" />
          <span
            className={cn(
              "text-sm",
              item.done && "line-through text-muted-foreground"
            )}
          >
            {item.text || "(Empty item)"}
          </span>
        </div>
        <div className="p-2 border-l text-center text-xs text-muted-foreground">
          {item.assignee || "—"}
        </div>
        <div className="p-2 border-l text-center text-xs text-muted-foreground">
          {formatDate(item.dueDate)}
        </div>
        <div className="p-2 border-l text-center">
          {item.priority ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                item.priority === "now" && "bg-red-500/20 text-red-600 border-red-500/30",
                item.priority === "next" && "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
                item.priority === "later" && "bg-gray-500/20 text-gray-600"
              )}
            >
              {item.priority}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="p-2 border-l text-center">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              item.done
                ? "bg-green-500/20 text-green-600 border-green-500/30"
                : "bg-muted text-muted-foreground"
            )}
          >
            {item.done ? "Done" : "Todo"}
          </Badge>
        </div>
      </div>

      {/* Children */}
      {hasChildren &&
        item.children!.map((child) => (
          <ReadonlyItemRow key={child.id} item={child} depth={depth + 1} />
        ))}
    </>
  );
}

// Export function for CSV
export function exportPlanToCSV(sections: PlanSection[], planTitle: string): string {
  const rows: string[][] = [];

  // Header row
  rows.push(["Initiative", "Task", "Subtask", "Assignee", "Due Date", "Priority", "Status"]);

  // Helper to escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Process each section
  sections.forEach((section) => {
    // Add initiative row
    rows.push([
      escapeCSV(section.title),
      "",
      "",
      "",
      "",
      "",
      section.status || "active"
    ]);

    // Process items recursively
    const processItem = (item: PlanItem, isSubtask: boolean = false) => {
      rows.push([
        "",
        isSubtask ? "" : escapeCSV(item.text || ""),
        isSubtask ? escapeCSV(item.text || "") : "",
        escapeCSV(item.assignee || ""),
        item.dueDate || "",
        item.priority || "",
        item.done ? "Done" : "Todo"
      ]);

      // Process children as subtasks
      if (item.children) {
        item.children.forEach((child) => processItem(child, true));
      }
    };

    section.items.forEach((item) => processItem(item));
  });

  return rows.map((row) => row.join(",")).join("\n");
}

// Download helper
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
