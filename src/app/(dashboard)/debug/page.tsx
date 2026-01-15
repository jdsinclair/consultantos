"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  RefreshCw,
  Database,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Cpu,
  Zap,
  Trash2,
  Calendar,
  MessageSquare,
  Code,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Source {
  id: string;
  name: string;
  type: string;
  fileType: string | null;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
  clientId: string;
  client?: { id: string; name: string };
}

interface ProcessingStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  error: number;
}

interface RagSearchResult {
  sourceId: string;
  sourceName: string;
  content: string;
  similarity: number;
  chunkIndex: number;
}

interface AILogEntry {
  id: string;
  timestamp: string;
  operation: string;
  model: string;
  status: "pending" | "success" | "error";
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  prompt?: string;
  systemPrompt?: string;
  response?: string;
}

export default function DebugPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [sourceChunks, setSourceChunks] = useState<Record<string, unknown[]>>({});
  const [loadingChunks, setLoadingChunks] = useState<string | null>(null);

  // RAG test section
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState<RagSearchResult[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragClientId, setRagClientId] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // AI Logs section
  const [aiLogs, setAiLogs] = useState<AILogEntry[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [aiLogsTotal, setAiLogsTotal] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logDebugInfo, setLogDebugInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchData();
    fetchAILogs();
  }, [filter]);

  const fetchAILogs = async () => {
    setAiLogsLoading(true);
    try {
      const res = await fetch("/api/debug/ai-logs?limit=100");
      if (res.ok) {
        const data = await res.json();
        setAiLogs(data.logs || []);
        setAiLogsTotal(data.total || 0);
        setLogDebugInfo(data.debug || null);
        console.log("[Debug] AI Logs response:", data);
      }
    } catch (error) {
      console.error("Failed to fetch AI logs:", error);
    } finally {
      setAiLogsLoading(false);
    }
  };

  const clearAILogs = async () => {
    if (!confirm("Are you sure you want to delete all AI logs?")) return;
    try {
      await fetch("/api/debug/ai-logs", { method: "DELETE" });
      setAiLogs([]);
      setAiLogsTotal(0);
    } catch (error) {
      console.error("Failed to clear AI logs:", error);
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const res = await fetch("/api/debug/ai-logs?action=cleanup", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.removedCount > 0) {
          alert(`Cleaned up ${data.removedCount} logs older than 7 days`);
          fetchAILogs();
        } else {
          alert("No old logs to clean up");
        }
      }
    } catch (error) {
      console.error("Failed to cleanup AI logs:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const [sourcesRes, clientsRes] = await Promise.all([
        fetch(`/api/debug/sources?${params.toString()}`),
        fetch("/api/clients"),
      ]);

      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSources(data.sources || []);
        setStats(data.stats || stats);
      }

      if (clientsRes.ok) {
        setClients(await clientsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch debug data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChunks = async (sourceId: string) => {
    if (sourceChunks[sourceId]) {
      setExpandedSource(expandedSource === sourceId ? null : sourceId);
      return;
    }

    setLoadingChunks(sourceId);
    try {
      const res = await fetch(`/api/sources/${sourceId}?includeChunks=true`);
      if (res.ok) {
        const data = await res.json();
        setSourceChunks({ ...sourceChunks, [sourceId]: data.chunks || [] });
        setExpandedSource(sourceId);
      }
    } catch (error) {
      console.error("Failed to fetch chunks:", error);
    } finally {
      setLoadingChunks(null);
    }
  };

  const testRagSearch = async () => {
    if (!ragQuery.trim()) return;

    setRagLoading(true);
    try {
      const params = new URLSearchParams({ query: ragQuery, limit: "10" });
      if (ragClientId) params.set("clientId", ragClientId);

      const res = await fetch(`/api/debug/rag-search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRagResults(data.results || []);
      }
    } catch (error) {
      console.error("RAG search failed:", error);
    } finally {
      setRagLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "error":
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter AI logs by status
  const filteredAiLogs = logFilter === "all"
    ? aiLogs
    : aiLogs.filter((log) => log.status === logFilter);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cpu className="h-8 w-8" />
            Debug & Processing
          </h1>
          <p className="text-muted-foreground">
            Monitor source processing, RAG chunks, and AI call logs
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
            <p className="text-sm text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.error}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Source Processing List */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Source Processing
            </CardTitle>
            <div className="flex gap-1">
              {["all", "pending", "processing", "completed", "error"].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  onClick={() => setFilter(f)}
                  className="text-xs capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sources.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sources.map((source) => (
                  <div key={source.id}>
                    <div
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                      onClick={() => fetchChunks(source.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{source.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.client?.name || "Unknown"} •{" "}
                            {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(source.processingStatus)}
                        {loadingChunks === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : expandedSource === source.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Expanded chunk view */}
                    {expandedSource === source.id && sourceChunks[source.id] && (
                      <div className="ml-6 mt-2 p-3 bg-background border rounded-lg text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium flex items-center gap-1">
                            <Layers className="h-4 w-4" />
                            {sourceChunks[source.id].length} chunks
                          </span>
                          <Link href={`/sources/${source.id}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Full View
                            </Button>
                          </Link>
                        </div>
                        {source.processingError && (
                          <div className="p-2 bg-red-50 text-red-700 rounded text-xs">
                            Error: {source.processingError}
                          </div>
                        )}
                        {(sourceChunks[source.id] as Array<{ id: string; chunkIndex: number; content: string }>).slice(0, 3).map((chunk, i) => (
                          <div key={chunk.id} className="p-2 bg-muted rounded text-xs">
                            <span className="font-mono text-muted-foreground">
                              Chunk {chunk.chunkIndex}:
                            </span>{" "}
                            {chunk.content.slice(0, 150)}...
                          </div>
                        ))}
                        {(sourceChunks[source.id] as unknown[]).length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{(sourceChunks[source.id] as unknown[]).length - 3} more chunks
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sources found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RAG Search Test */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              RAG Vector Search Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={ragClientId}
                  onChange={(e) => setRagClientId(e.target.value)}
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a search query..."
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && testRagSearch()}
                    className="flex-1"
                  />
                  <Button onClick={testRagSearch} disabled={ragLoading || !ragQuery.trim()}>
                    {ragLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {ragResults.length > 0 ? (
                  ragResults.map((result, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs truncate max-w-[200px]">
                          {result.sourceName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {(result.similarity * 100).toFixed(1)}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {result.content}
                      </p>
                    </div>
                  ))
                ) : ragQuery && !ragLoading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results found</p>
                    <p className="text-xs">Try a different query</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Zap className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Enter a query to test RAG search</p>
                    <p className="text-xs">This searches your knowledge base using vector similarity</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Call Logs - Full Width */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              AI Call Logs
              {aiLogsTotal > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {aiLogsTotal} total
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Persistent logs - survives page navigation. Auto-cleanup after 7 days.
              {logDebugInfo && (
                <span className="ml-2 text-orange-600">
                  [File: {logDebugInfo.fileExists ? `exists (${logDebugInfo.fileSize} bytes)` : `NOT FOUND - ${logDebugInfo.fileError}`}]
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 mr-2">
              {["all", "success", "error"].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={logFilter === f ? "default" : "ghost"}
                  onClick={() => setLogFilter(f)}
                  className="text-xs capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchAILogs} disabled={aiLogsLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${aiLogsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={cleanupOldLogs}>
              <Calendar className="h-4 w-4 mr-1" />
              Cleanup Old
            </Button>
            <Button size="sm" variant="destructive" onClick={clearAILogs}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiLogsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAiLogs.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredAiLogs.map((log) => (
                <div key={log.id}>
                  <div
                    className={`p-3 rounded-lg text-sm cursor-pointer transition-colors ${
                      log.status === "error"
                        ? "bg-red-50 border border-red-200 hover:bg-red-100"
                        : log.status === "pending"
                        ? "bg-blue-50 border border-blue-200 hover:bg-blue-100"
                        : "bg-green-50 border border-green-200 hover:bg-green-100"
                    }`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {log.status === "pending" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {log.status === "success" && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {log.status === "error" && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-semibold">{log.operation}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.model}
                        </Badge>
                        {log.inputTokens && log.outputTokens && (
                          <Badge variant="secondary" className="text-xs">
                            {log.inputTokens} in / {log.outputTokens} out
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {log.duration && (
                          <span className="font-mono">{log.duration}ms</span>
                        )}
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        {expandedLog === log.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    {log.error && (
                      <p className="text-sm text-red-700 font-mono bg-red-100 rounded p-2 mt-2">
                        {log.error}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(log.metadata)
                          .map(([k, v]) => `${k}: ${String(v).slice(0, 50)}`)
                          .join(" | ")}
                      </p>
                    )}
                  </div>

                  {/* Expanded view with full prompt/response */}
                  {expandedLog === log.id && (
                    <div className="ml-4 mt-2 space-y-3 border-l-2 border-muted pl-4 pb-2">
                      {log.systemPrompt && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                            <Code className="h-3 w-3" />
                            SYSTEM PROMPT
                          </div>
                          <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                            {log.systemPrompt}
                          </pre>
                        </div>
                      )}
                      {log.prompt && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                            <MessageSquare className="h-3 w-3" />
                            INPUT PROMPT
                          </div>
                          <pre className="text-xs bg-blue-50 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                            {log.prompt}
                          </pre>
                        </div>
                      )}
                      {log.response && (
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                            <Cpu className="h-3 w-3" />
                            AI RESPONSE
                          </div>
                          <pre className="text-xs bg-green-50 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                            {log.response}
                          </pre>
                        </div>
                      )}
                      {!log.systemPrompt && !log.prompt && !log.response && (
                        <p className="text-xs text-muted-foreground italic">
                          No prompt/response data captured for this log entry.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No AI calls logged yet</p>
              <p className="text-xs">Logs appear when AI operations run (upload, reprocess, chat, etc.)</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
