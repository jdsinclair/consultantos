"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, X, Sparkles, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteDialogProps {
  clientId: string;
  sessionId?: string;
  onNoteCreated?: (note: unknown) => void;
  trigger?: React.ReactNode;
}

const NOTE_TYPES = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-700" },
  { value: "future", label: "Future", color: "bg-blue-100 text-blue-700" },
  { value: "competitor", label: "Competitor", color: "bg-red-100 text-red-700" },
  { value: "partner", label: "Partner", color: "bg-green-100 text-green-700" },
  { value: "idea", label: "Idea", color: "bg-purple-100 text-purple-700" },
  { value: "reference", label: "Reference", color: "bg-amber-100 text-amber-700" },
] as const;

export function NoteDialog({ clientId, sessionId, onNoteCreated, trigger }: NoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<string>("general");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [extractTodos, setExtractTodos] = useState(false);

  const handleAddLabel = () => {
    const trimmed = labelInput.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setLabelInput("");
    }
  };

  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          sessionId,
          content: content.trim(),
          noteType,
          labels: labels.length > 0 ? labels : undefined,
          isPinned,
          extractTodos,
          generateTitle: true, // Always generate AI title
        }),
      });

      if (!res.ok) throw new Error("Failed to create note");

      const data = await res.json();
      onNoteCreated?.(data.note);

      // Reset form
      setContent("");
      setNoteType("general");
      setLabels([]);
      setIsPinned(false);
      setExtractTodos(false);
      setOpen(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="h-3 w-3" />
            Add Note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            New Note
            <span className="text-xs text-muted-foreground font-normal">
              (AI will generate title)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Note Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Note Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Note Type */}
          <div className="space-y-2">
            <Label>Note Type</Label>
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNoteType(type.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium transition-all",
                    noteType === type.value
                      ? type.color + " ring-2 ring-offset-1 ring-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a label..."
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddLabel}>
                Add
              </Button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {labels.map((label) => (
                  <Badge key={label} variant="secondary" className="gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Pin className="h-3 w-3" />
              Pin note
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={extractTodos}
                onChange={(e) => setExtractTodos(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Sparkles className="h-3 w-3" />
              Extract action items
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
