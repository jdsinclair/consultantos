"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Globe,
  Database,
  Loader2,
  ExternalLink,
  Edit2,
  Save,
  X,
  Lightbulb,
  Layers,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface SourceChunk {
  id: string;
  content: string;
  chunkIndex: number;
  startChar: number | null;
  endChar: number | null;
}

interface AISummary {
  whatItIs: string;
  whyItMatters: string;
  keyInsights: string[];
  suggestedUses: string[];
  generatedAt: string;
  editedAt?: string;
  isEdited?: boolean;
}

interface Source {
  id: string;
  clientId: string;
  name: string;
  type: string;
  fileType: string | null;
  fileSize: number | null;
  blobUrl: string | null;
  url: string | null;
  content: string | null;
  aiSummary: AISummary | null;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  chunks?: SourceChunk[];
  chunkCount: number;
}

type TabType = "summary" | "raw" | "chunks";

export default function SourceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedSummary, setEditedSummary] = useState<AISummary | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    fetchSource();
  }, [params.id]);

  const fetchSource = async () => {
    try {
      const res = await fetch(`/api/sources/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch source");
      const data = await res.json();
      setSource(data);
      if (data.aiSummary) {
        setEditedSummary(data.aiSummary);
      }
    } catch (error) {
      console.error("Error fetching source:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChunks = async () => {
    if (chunks.length > 0) return;
    setLoadingChunks(true);
    try {
      const res = await fetch(`/api/sources/${params.id}?includeChunks=true`);
      if (!res.ok) throw new Error("Failed to fetch chunks");
      const data = await res.json();
      setChunks(data.chunks || []);
    } catch (error) {
      console.error("Error fetching chunks:", error);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "chunks" && chunks.length === 0) {
      fetchChunks();
    }
  };

  const handleSaveSummary = async () => {
    if (!editedSummary) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sources/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiSummary: editedSummary }),
      });
      if (!res.ok) throw new Error("Failed to save summary");
      const updated = await res.json();
      setSource(updated);
      setEditing(false);
    } catch (error) {
      console.error("Error saving summary:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const res = await fetch(`/api/sources/${params.id}/reprocess`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start reprocessing");
      // Optimistically update status
      setSource((prev) => prev && { ...prev, processingStatus: "processing" });
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const checkRes = await fetch(`/api/sources/${params.id}`);
        if (checkRes.ok) {
          const data = await checkRes.json();
          if (data.processingStatus !== "processing") {
            clearInterval(pollInterval);
            setSource(data);
            if (data.aiSummary) setEditedSummary(data.aiSummary);
            setReprocessing(false);
          }
        }
      }, 2000);
      // Stop polling after 60 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        setReprocessing(false);
        fetchSource();
      }, 60000);
    } catch (error) {
      console.error("Error reprocessing:", error);
      setReprocessing(false);
    }
  };

  const handleResetStatus = async () => {
    if (!confirm("Reset this source's status? This will mark it as completed if it has content, or pending if it doesn't.")) return;
    try {
      const newStatus = source?.content ? "completed" : "pending";
      const res = await fetch(`/api/sources/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processingStatus: newStatus, processingError: null }),
      });
      if (!res.ok) throw new Error("Failed to reset status");
      const updated = await res.json();
      setSource(updated);
    } catch (error) {
      console.error("Error resetting status:", error);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-6 w-6" />;
      case "website":
        return <Globe className="h-6 w-6" />;
      case "repo":
        return <Database className="h-6 w-6" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Source not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Link
        href="/sources"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sources
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              {getSourceIcon(source.type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{source.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="capitalize">{source.type}</span>
                {source.fileType && <span>• {source.fileType.toUpperCase()}</span>}
                {source.fileSize && <span>• {formatFileSize(source.fileSize)}</span>}
                <span>• {source.chunkCount} chunks</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={source.processingStatus === "completed" ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {source.processingStatus === "completed" ? (
                <CheckCircle className="h-3 w-3" />
              ) : source.processingStatus === "failed" ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {source.processingStatus}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleReprocess}
              disabled={reprocessing || source.processingStatus === "processing"}
            >
              <RefreshCw className={`h-4 w-4 ${reprocessing ? "animate-spin" : ""}`} />
              {reprocessing ? "Reprocessing..." : "Retry"}
            </Button>
            {source.processingStatus === "processing" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={handleResetStatus}
              >
                <X className="h-4 w-4" />
                Kill
              </Button>
            )}
            {source.blobUrl && (
              <a href={source.blobUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleTabChange("summary")}
        >
          <Lightbulb className="h-4 w-4 inline mr-2" />
          AI Summary
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "raw"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleTabChange("raw")}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          Raw Content
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "chunks"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => handleTabChange("chunks")}
        >
          <Layers className="h-4 w-4 inline mr-2" />
          RAG Chunks ({source.chunkCount})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {source.aiSummary || editedSummary ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {source.aiSummary?.isEdited ? (
                    <>Edited {format(new Date(source.aiSummary.editedAt!), "MMM d, yyyy")}</>
                  ) : source.aiSummary?.generatedAt ? (
                    <>Generated {format(new Date(source.aiSummary.generatedAt), "MMM d, yyyy")}</>
                  ) : null}
                </div>
                {editing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveSummary} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What It Is</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea
                      value={editedSummary?.whatItIs || ""}
                      onChange={(e) =>
                        setEditedSummary((prev) => prev && { ...prev, whatItIs: e.target.value })
                      }
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm">{source.aiSummary?.whatItIs}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why It Matters</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea
                      value={editedSummary?.whyItMatters || ""}
                      onChange={(e) =>
                        setEditedSummary((prev) => prev && { ...prev, whyItMatters: e.target.value })
                      }
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm">{source.aiSummary?.whyItMatters}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-2">
                      {editedSummary?.keyInsights.map((insight, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={insight}
                            onChange={(e) => {
                              const newInsights = [...(editedSummary?.keyInsights || [])];
                              newInsights[i] = e.target.value;
                              setEditedSummary((prev) => prev && { ...prev, keyInsights: newInsights });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newInsights = editedSummary?.keyInsights.filter((_, j) => j !== i) || [];
                              setEditedSummary((prev) => prev && { ...prev, keyInsights: newInsights });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditedSummary((prev) =>
                            prev && { ...prev, keyInsights: [...prev.keyInsights, ""] }
                          )
                        }
                      >
                        Add Insight
                      </Button>
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {source.aiSummary?.keyInsights.map((insight, i) => (
                        <li key={i} className="text-sm">{insight}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suggested Uses</CardTitle>
                  <CardDescription>How this could be used in consulting</CardDescription>
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-2">
                      {editedSummary?.suggestedUses.map((use, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={use}
                            onChange={(e) => {
                              const newUses = [...(editedSummary?.suggestedUses || [])];
                              newUses[i] = e.target.value;
                              setEditedSummary((prev) => prev && { ...prev, suggestedUses: newUses });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newUses = editedSummary?.suggestedUses.filter((_, j) => j !== i) || [];
                              setEditedSummary((prev) => prev && { ...prev, suggestedUses: newUses });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditedSummary((prev) =>
                            prev && { ...prev, suggestedUses: [...prev.suggestedUses, ""] }
                          )
                        }
                      >
                        Add Use
                      </Button>
                    </div>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {source.aiSummary?.suggestedUses.map((use, i) => (
                        <li key={i} className="text-sm">{use}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {source.processingStatus === "processing"
                    ? "AI summary is being generated..."
                    : "No AI summary available for this source."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "raw" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raw Extracted Content</CardTitle>
            <CardDescription>
              {source.content ? `${source.content.length.toLocaleString()} characters` : "No content extracted"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {source.type === "image" && source.blobUrl && (
              <div className="mb-6">
                <img
                  src={source.blobUrl}
                  alt={source.name}
                  className="max-w-full max-h-96 rounded-lg border mx-auto"
                />
              </div>
            )}
            {source.content ? (
              <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg max-h-[600px] overflow-auto font-mono">
                {source.content}
              </pre>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {source.processingStatus === "processing"
                  ? "Content is being extracted..."
                  : "No content available"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "chunks" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RAG Chunks</CardTitle>
              <CardDescription>
                Content split into {source.chunkCount} chunks for semantic search.
                Each chunk is embedded and used for retrieval-augmented generation.
              </CardDescription>
            </CardHeader>
          </Card>

          {loadingChunks ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chunks.length > 0 ? (
            chunks.map((chunk, index) => (
              <Card key={chunk.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Chunk {chunk.chunkIndex + 1}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {chunk.content.length} chars
                      {chunk.startChar !== null && chunk.endChar !== null && (
                        <> • pos {chunk.startChar}-{chunk.endChar}</>
                      )}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-muted/30 p-3 rounded font-mono whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {source.processingStatus === "processing"
                    ? "Chunks are being created..."
                    : "No chunks created for this source."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metadata */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">Source Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{format(new Date(source.createdAt), "MMM d, yyyy h:mm a")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd>{format(new Date(source.updatedAt), "MMM d, yyyy h:mm a")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source ID</dt>
              <dd className="font-mono text-xs">{source.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Client ID</dt>
              <dd className="font-mono text-xs">{source.clientId}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
