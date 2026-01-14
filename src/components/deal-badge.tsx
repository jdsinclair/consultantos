"use client";

import { useState } from "react";
import { useDealMode } from "@/contexts/deal-mode";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DealBadgeProps {
  clientId: string;
  dealValue?: number | null; // in cents
  dealStatus?: string | null;
  status?: string | null; // client status (prospect, active, etc.)
  onUpdate?: (data: { dealValue?: number; dealStatus?: string; status?: string }) => Promise<void>;
  compact?: boolean;
  className?: string;
}

const dealStatusLabels: Record<string, string> = {
  none: "No Quote",
  placeholder: "Thinking",
  presented: "Presented",
  active: "Active",
};

const dealStatusColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-600",
  placeholder: "bg-yellow-100 text-yellow-700",
  presented: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  prospect: "Prospect",
  active: "Client",
  paused: "Paused",
  completed: "Completed",
  prospect_lost: "Lost",
  client_cancelled: "Cancelled",
};

export function formatDealValue(cents: number | null | undefined): string {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DealBadge({
  clientId,
  dealValue,
  dealStatus = "none",
  status,
  onUpdate,
  compact = false,
  className,
}: DealBadgeProps) {
  const { dealModeEnabled } = useDealMode();
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(dealValue ? (dealValue / 100).toString() : "");
  const [editDealStatus, setEditDealStatus] = useState(dealStatus || "none");
  const [editStatus, setEditStatus] = useState(status || "prospect");
  const [saving, setSaving] = useState(false);

  // Don't render anything if deal mode is off
  if (!dealModeEnabled) {
    return null;
  }

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate({
        dealValue: editValue ? Math.round(parseFloat(editValue) * 100) : undefined,
        dealStatus: editDealStatus,
        status: editStatus,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update deal:", error);
    } finally {
      setSaving(false);
    }
  };

  // Compact mode for list tiles - just show the $ value
  if (compact) {
    return (
      <span
        className={cn(
          "text-xs font-medium text-green-600",
          className
        )}
      >
        {dealValue ? formatDealValue(dealValue) : "—"}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
            "hover:bg-green-50 border border-transparent hover:border-green-200",
            dealValue ? "text-green-600" : "text-muted-foreground",
            className
          )}
          title="Edit deal details"
        >
          <DollarSign className="h-3 w-3" />
          {dealValue ? formatDealValue(dealValue) : "Set value"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dealValue">Deal Value</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="dealValue"
                type="number"
                placeholder="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deal Status</Label>
            <Select value={editDealStatus} onValueChange={setEditDealStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Quote</SelectItem>
                <SelectItem value="placeholder">Thinking (No Quote Yet)</SelectItem>
                <SelectItem value="presented">Presented</SelectItem>
                <SelectItem value="active">Active (Signed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="active">Client</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="prospect_lost">Prospect Lost</SelectItem>
                <SelectItem value="client_cancelled">Client Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Small inline badge for lists
export function DealValueBadge({ value }: { value?: number | null }) {
  const { dealModeEnabled } = useDealMode();

  if (!dealModeEnabled || !value) {
    return null;
  }

  return (
    <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
      {formatDealValue(value)}
    </span>
  );
}

// Status badge with deal context
export function DealStatusBadge({
  dealStatus,
  status
}: {
  dealStatus?: string | null;
  status?: string | null;
}) {
  const { dealModeEnabled } = useDealMode();

  if (!dealModeEnabled) {
    return null;
  }

  const ds = dealStatus || "none";

  return (
    <span className={cn(
      "text-xs font-medium px-1.5 py-0.5 rounded",
      dealStatusColors[ds]
    )}>
      {dealStatusLabels[ds]}
    </span>
  );
}
