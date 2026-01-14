"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  Clock,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  owner?: string;
  ownerType?: string;
  client?: {
    id: string;
    name: string;
  };
}

interface ActionItemsListProps {
  items: ActionItem[];
  showClient?: boolean;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (title: string) => void;
}

export function ActionItemsList({
  items,
  showClient = false,
  onComplete,
  onDelete,
  onAdd,
}: ActionItemsListProps) {
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim() && onAdd) {
      onAdd(newItem.trim());
      setNewItem("");
      setIsAdding(false);
    }
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-500",
    high: "bg-orange-500/20 text-orange-500",
    medium: "bg-yellow-500/20 text-yellow-500",
    low: "bg-gray-500/20 text-gray-500",
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors group"
        >
          <button
            onClick={() => onComplete?.(item.id)}
            className="mt-0.5 flex-shrink-0"
          >
            {item.status === "completed" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${
                item.status === "completed"
                  ? "line-through text-muted-foreground"
                  : ""
              }`}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {showClient && item.client && (
                <Badge variant="outline" className="text-xs">
                  {item.client.name}
                </Badge>
              )}
              <Badge className={`text-xs ${priorityColors[item.priority]}`}>
                {item.priority}
              </Badge>
              {item.ownerType === "client" && (
                <Badge variant="secondary" className="text-xs">
                  Client
                </Badge>
              )}
              {item.dueDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}

      {items.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No action items yet
        </p>
      )}

      {isAdding ? (
        <div className="flex gap-2">
          <Input
            placeholder="Enter action item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <Button size="sm" onClick={handleAdd}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        onAdd && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Action Item
          </Button>
        )
      )}
    </div>
  );
}
