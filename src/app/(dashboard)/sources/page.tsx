"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Globe,
  Github,
  Upload,
  Search,
  Loader2,
  ChevronDown,
  ExternalLink,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Eye,
  Video,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Source {
  id: string;
  name: string;
  originalName: string | null;
  type: string;
  url: string | null;
  blobUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  processingStatus: string;
  processingError: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
  } | null;
  metadata?: {
    sessionId?: string;
    contentType?: string;
    sessionTitle?: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sourcesRes, clientsRes] = await Promise.all([
          fetch("/api/sources"),
          fetch("/api/clients"),
        ]);

        if (sourcesRes.ok) {
          const data = await sourcesRes.json();
          setSources(data);
        }
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await fetch(`/api/sources/${id}/process`, { method: "POST" });
      setSources((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, processingStatus: "processing" } : s
        )
      );
    } catch (error) {
      console.error("Failed to reprocess source:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "website":
        return <Globe className="h-4 w-4" />;
      case "repository":
        return <Github className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "session_transcript":
        return <MessageSquare className="h-4 w-4" />;
      case "session_notes":
        return <StickyNote className="h-4 w-4" />;
      case "recording":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isSessionSource = (type: string) =>
    type === "session_transcript" || type === "session_notes";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Ready</Badge>;
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      !searchQuery ||
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.client?.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Handle "session" filter which matches multiple types
    const matchesType =
      !typeFilter ||
      (typeFilter === "session"
        ? isSessionSource(source.type)
        : source.type === typeFilter);
    const matchesClient = !clientFilter || source.client?.id === clientFilter;

    return matchesSearch && matchesType && matchesClient;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground">All uploaded documents, websites, and repositories</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <Button
            variant={typeFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(null)}
          >
            All Types
          </Button>
          <Button
            variant={typeFilter === "document" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("document")}
            className="gap-1"
          >
            <FileText className="h-3 w-3" />
            Documents
          </Button>
          <Button
            variant={typeFilter === "website" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("website")}
            className="gap-1"
          >
            <Globe className="h-3 w-3" />
            Websites
          </Button>
          <Button
            variant={typeFilter === "repository" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("repository")}
            className="gap-1"
          >
            <Github className="h-3 w-3" />
            Repos
          </Button>
          <Button
            variant={typeFilter === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("image")}
            className="gap-1"
          >
            <ImageIcon className="h-3 w-3" />
            Images
          </Button>
          <Button
            variant={typeFilter === "session" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("session")}
            className="gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            Sessions
          </Button>
        </div>

        {/* Client Filter */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowClientDropdown(!showClientDropdown)}
          >
            {clientFilter
              ? clients.find((c) => c.id === clientFilter)?.name
              : "All Clients"}
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showClientDropdown && (
            <div className="absolute top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10">
              <div
                className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                onClick={() => {
                  setClientFilter(null);
                  setShowClientDropdown(false);
                }}
              >
                All Clients
              </div>
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                  onClick={() => {
                    setClientFilter(client.id);
                    setShowClientDropdown(false);
                  }}
                >
                  {client.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sources List */}
      {filteredSources.length > 0 ? (
        <div className="space-y-3">
          {filteredSources.map((source) => (
            <Card key={source.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {getTypeIcon(source.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sources/${source.id}`}
                        className="font-medium truncate hover:text-primary hover:underline"
                      >
                        {source.name}
                      </Link>
                      {source.fileType && (
                        <Badge variant="outline" className="text-xs uppercase">
                          {source.fileType}
                        </Badge>
                      )}
                      {isSessionSource(source.type) && (
                        <Badge variant="secondary" className="text-xs">
                          {source.type === "session_transcript" ? "Transcript" : "Notes"}
                        </Badge>
                      )}
                    </div>
                    {source.originalName && source.originalName !== source.name && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        {source.originalName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {source.client && (
                        <>
                          <Link
                            href={`/clients/${source.client.id}`}
                            className="hover:text-primary"
                          >
                            {source.client.name}
                          </Link>
                          <span>·</span>
                        </>
                      )}
                      <span>
                        Added {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true })}
                      </span>
                      {source.fileSize && (
                        <>
                          <span>·</span>
                          <span>{formatFileSize(source.fileSize)}</span>
                        </>
                      )}
                      {source.metadata?.sessionId && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/sessions/${source.metadata.sessionId}`}
                            className="hover:text-primary inline-flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            From Session
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(source.processingStatus)}

                    <Link href={`/sources/${source.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </Link>

                    {source.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {source.blobUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={source.blobUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {source.processingStatus === "error" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReprocess(source.id)}
                        title="Retry processing"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(source.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {source.processingError && (
                  <p className="mt-2 text-xs text-destructive">{source.processingError}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || typeFilter || clientFilter ? "No sources found" : "No sources yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {searchQuery || typeFilter || clientFilter
              ? "Try adjusting your search or filters"
              : "Add sources to your clients to build their knowledge base"}
          </p>
          {!searchQuery && !typeFilter && !clientFilter && clients.length > 0 && (
            <Link href={`/clients/${clients[0].id}`}>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Add Sources to Client
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
