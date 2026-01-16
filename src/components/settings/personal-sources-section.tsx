"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FolderOpen,
  Plus,
  Loader2,
  FileText,
  BookOpen,
  Newspaper,
  Presentation,
  Mic,
  Globe,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface PersonalSource {
  id: string;
  name: string;
  type: string;
  personalCategory: string | null;
  url: string | null;
  content: string | null;
  processingStatus: string;
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  newsletter: <Newspaper className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
  framework: <Presentation className="h-4 w-4" />,
  course: <FileText className="h-4 w-4" />,
  podcast: <Mic className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  book: "Book",
  framework: "Framework",
  course: "Course",
  podcast: "Podcast",
  website: "Website",
  other: "Other",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  processing: <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

export function PersonalSourcesSection() {
  const [sources, setSources] = useState<PersonalSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newSource, setNewSource] = useState({
    name: "",
    type: "website",
    category: "other",
    url: "",
    content: "",
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources/personal");
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (error) {
      console.error("Failed to fetch personal sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSource = async () => {
    if (!newSource.name) return;

    setAdding(true);
    try {
      const res = await fetch("/api/sources/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSource),
      });

      if (res.ok) {
        const data = await res.json();
        setSources((prev) => [data, ...prev]);
        setShowAddDialog(false);
        setNewSource({ name: "", type: "website", category: "other", url: "", content: "" });
      }
    } catch (error) {
      console.error("Failed to add source:", error);
    } finally {
      setAdding(false);
    }
  };

  const deleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/sources/personal/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  const reprocessSource = async (id: string) => {
    try {
      await fetch(`/api/sources/personal/${id}/reprocess`, {
        method: "POST",
      });

      // Update status locally
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, processingStatus: "processing" } : s))
      );

      // Poll for completion
      const checkStatus = async () => {
        const res = await fetch(`/api/sources/personal/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSources((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, processingStatus: data.processingStatus } : s
            )
          );
          if (data.processingStatus === "processing") {
            setTimeout(checkStatus, 2000);
          }
        }
      };
      setTimeout(checkStatus, 2000);
    } catch (error) {
      console.error("Failed to reprocess source:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Personal Knowledge Base
            </CardTitle>
            <CardDescription>
              Your content, frameworks, and knowledge that AI can reference
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Knowledge Source</DialogTitle>
                <DialogDescription>
                  Add content from your newsletters, books, frameworks, or other IP
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="e.g., Growth Strategy Framework"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newSource.type}
                      onValueChange={(v) => setNewSource({ ...newSource, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website/URL</SelectItem>
                        <SelectItem value="document">Document/Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newSource.category}
                      onValueChange={(v) => setNewSource({ ...newSource, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="framework">Framework</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newSource.type === "website" && (
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={newSource.url}
                      onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {newSource.type === "document" && (
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={newSource.content}
                      onChange={(e) => setNewSource({ ...newSource, content: e.target.value })}
                      placeholder="Paste your content here..."
                      rows={8}
                    />
                  </div>
                )}

                <Button onClick={addSource} disabled={adding || !newSource.name} className="w-full">
                  {adding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Source"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No personal knowledge sources yet</p>
            <p className="text-sm mt-1">
              Add your newsletters, books, frameworks, or other content
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {CATEGORY_ICONS[source.personalCategory || "other"]}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{source.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[source.personalCategory || "other"]}
                      </Badge>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground truncate max-w-48"
                        >
                          {source.url}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {STATUS_ICONS[source.processingStatus]}
                    <span className="text-xs text-muted-foreground capitalize">
                      {source.processingStatus}
                    </span>
                  </div>

                  {source.processingStatus === "failed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reprocessSource(source.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p className="font-medium mb-1">How this works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Content is processed and indexed for AI retrieval</li>
            <li>When you ask strategy questions, AI references your knowledge</li>
            <li>Great for newsletters, frameworks, books, courses you&apos;ve created</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
