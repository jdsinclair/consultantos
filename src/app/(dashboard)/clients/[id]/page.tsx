"use client";

import { useState, useEffect } from "react";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  FileText,
  Globe,
  FolderGit2,
  Plus,
  Send,
  Calendar,
  CheckCircle,
  Circle,
  MessageSquare,
  Loader2,
  ExternalLink,
  Trash2,
  ArrowLeft,
  Edit2,
  Sparkles,
  Mail,
  StickyNote,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isPast } from "date-fns";
import { FileUpload } from "@/components/file-upload";
import { SourceAdder } from "@/components/source-adder";
import { TodoQuickAdd } from "@/components/todo-quick-add";
import { DealBadge } from "@/components/deal-badge";
import { NoteDialog } from "@/components/note-dialog";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  company: string | null;
  industry: string | null;
  status: string;
  description: string | null;
  website: string | null;
  dealValue: number | null;
  dealStatus: string | null;
}

interface Source {
  id: string;
  type: string;
  name: string;
  url: string | null;
  blobUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  processingStatus: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  duration: number | null;
  createdAt: string;
}

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  ownerType: string;
  source: string;
  sourceContext?: string;
  dueDate: string | null;
}

interface Note {
  id: string;
  title?: string;
  content: string;
  isPinned: boolean;
  noteType?: string;
  labels?: string[];
  createdAt: string;
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  future: "bg-blue-100 text-blue-700",
  competitor: "bg-red-100 text-red-700",
  partner: "bg-green-100 text-green-700",
  idea: "bg-purple-100 text-purple-700",
  reference: "bg-amber-100 text-amber-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const sourceIcons: Record<string, React.ReactNode> = {
  detected: <Sparkles className="h-3 w-3" />,
  note: <StickyNote className="h-3 w-3" />,
  transcript: <Mic className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTodo, setShowAddTodo] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading: chatLoading } = useChat({
    api: "/api/chat",
    body: { clientId: params.id },
  });

  const fetchActionItems = async () => {
    try {
      const res = await fetch(`/api/action-items?clientId=${params.id}&status=pending`);
      if (res.ok) setActionItems(await res.json());
    } catch (error) {
      console.error("Failed to fetch action items:", error);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/notes?clientId=${params.id}&limit=5`);
      if (res.ok) setNotes(await res.json());
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, sourcesRes, sessionsRes, actionsRes, notesRes] = await Promise.all([
          fetch(`/api/clients/${params.id}`),
          fetch(`/api/clients/${params.id}/sources`),
          fetch(`/api/sessions?clientId=${params.id}`),
          fetch(`/api/action-items?clientId=${params.id}&status=pending`),
          fetch(`/api/notes?clientId=${params.id}&limit=5`),
        ]);

        if (clientRes.ok) setClient(await clientRes.json());
        if (sourcesRes.ok) setSources(await sourcesRes.json());
        if (sessionsRes.ok) setSessions(await sessionsRes.json());
        if (actionsRes.ok) setActionItems(await actionsRes.json());
        if (notesRes.ok) setNotes(await notesRes.json());
      } catch (error) {
        console.error("Failed to fetch client data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleSourceAdded = async () => {
    // Refetch sources after a new one is added
    try {
      const res = await fetch(`/api/clients/${params.id}/sources`);
      if (res.ok) {
        setSources(await res.json());
      }
    } catch (error) {
      console.error("Failed to refresh sources:", error);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Delete this source?")) return;
    try {
      await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleToggleAction = async (id: string, completed: boolean) => {
    try {
      await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });
      if (completed) {
        setActionItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Failed to update action item:", error);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "website": return Globe;
      case "repository": return FolderGit2;
      default: return FileText;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found</p>
        <Link href="/clients">
          <Button className="mt-4">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{client.name}</h1>
                <Badge variant={client.status === "active" ? "default" : "secondary"}>
                  {client.status}
                </Badge>
                <DealBadge
                  clientId={client.id}
                  dealValue={client.dealValue}
                  dealStatus={client.dealStatus}
                  status={client.status}
                  onUpdate={async (data) => {
                    const res = await fetch(`/api/clients/${client.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setClient(updated);
                    }
                  }}
                />
              </div>
              {(client.company || client.industry) && (
                <p className="text-muted-foreground">
                  {client.company}{client.company && client.industry && " · "}{client.industry}
                </p>
              )}
              {client.description && (
                <p className="mt-2 text-sm max-w-2xl">{client.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link href={`/clients/${client.id}/clarity`}>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Clarity Doc
                </Button>
              </Link>
              <Link href={`/session/new?client=${client.id}`}>
                <Button className="gap-2">
                  <Mic className="h-4 w-4" />
                  Start Session
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sources */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Sources ({sources.length})</CardTitle>
              <SourceAdder clientId={params.id} onSourceAdded={handleSourceAdded} />
            </CardHeader>
            <CardContent>
              {sources.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {sources.map((source) => {
                    const Icon = getSourceIcon(source.type);
                    return (
                      <div
                        key={source.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors group"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{source.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.url || formatFileSize(source.fileSize) || source.fileType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {source.processingStatus === "processing" && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {source.processingStatus === "error" && (
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          )}
                          {(source.url || source.blobUrl) && (
                            <a
                              href={source.url || source.blobUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteSource(source.id)}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <FileUpload
                clientId={params.id}
                onUploadComplete={(source) => {
                  setSources((prev) => [source as Source, ...prev]);
                }}
              />
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
              <Link href={`/session/new?client=${client.id}`}>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" />
                  New Session
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <Link
                      key={session.id}
                      href={`/session/${session.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                          {session.duration && ` · ${Math.round(session.duration / 60)} min`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {session.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                  <Link href={`/session/new?client=${client.id}`}>
                    <Button size="sm" className="mt-2">Start First Session</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Action Items
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{actionItems.length} pending</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setShowAddTodo(!showAddTodo)}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddTodo && (
                <div className="mb-4 pb-4 border-b">
                  <TodoQuickAdd
                    clientId={params.id}
                    onAdd={() => {
                      fetchActionItems();
                      setShowAddTodo(false);
                    }}
                  />
                </div>
              )}
              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((item) => {
                    const isOverdue = item.dueDate && isPast(new Date(item.dueDate));
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleAction(item.id, true)}
                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Circle className="h-5 w-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{item.title}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", priorityColors[item.priority])}
                            >
                              {item.priority}
                            </Badge>
                            {item.source !== "manual" && sourceIcons[item.source] && (
                              <span className="text-muted-foreground" title={`AI ${item.source}`}>
                                {sourceIcons[item.source]}
                              </span>
                            )}
                            {item.ownerType === "client" && (
                              <Badge variant="outline" className="text-xs">
                                Client
                              </Badge>
                            )}
                          </div>
                          {item.dueDate && (
                            <p
                              className={cn(
                                "text-xs mt-1",
                                isOverdue ? "text-red-600" : "text-muted-foreground"
                              )}
                            >
                              {isOverdue && <AlertCircle className="h-3 w-3 inline mr-1" />}
                              Due {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No pending action items</p>
                  {!showAddTodo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setShowAddTodo(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add first task
                    </Button>
                  )}
                </div>
              )}
              <Link
                href={`/todos?clientId=${params.id}`}
                className="block text-center mt-4 text-xs text-muted-foreground hover:text-foreground"
              >
                View all action items →
              </Link>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{notes.length}</Badge>
                <NoteDialog
                  clientId={params.id}
                  onNoteCreated={() => fetchNotes()}
                />
              </div>
            </CardHeader>
            <CardContent>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.slice(0, 3).map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.title && (
                            <p className="text-sm font-medium">{note.title}</p>
                          )}
                          {note.noteType && note.noteType !== "general" && (
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", NOTE_TYPE_COLORS[note.noteType])}
                            >
                              {note.noteType}
                            </Badge>
                          )}
                          {note.isPinned && (
                            <span className="text-amber-500" title="Pinned">
                              📌
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {note.content}
                      </p>
                      {note.labels && note.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.labels.map((label) => (
                            <Badge key={label} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    No notes yet
                  </p>
                  <NoteDialog
                    clientId={params.id}
                    onNoteCreated={() => fetchNotes()}
                    trigger={
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add first note
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Chat */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask About {client.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length > 0 && (
                  <div className="max-h-48 overflow-auto space-y-2 mb-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`text-sm ${
                          m.role === "user" ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-medium">{m.role === "user" ? "You: " : "AI: "}</span>
                        {m.content}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask anything about this client..."
                    value={input}
                    onChange={handleInputChange}
                    disabled={chatLoading}
                  />
                  <Button type="submit" size="icon" disabled={chatLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const fakeEvent = { target: { value: "What was our last discussion about?" } };
                      handleInputChange(fakeEvent as React.ChangeEvent<HTMLInputElement>);
                    }}
                  >
                    Last discussion?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const fakeEvent = { target: { value: "Summarize all open items and commitments" } };
                      handleInputChange(fakeEvent as React.ChangeEvent<HTMLInputElement>);
                    }}
                  >
                    Open items
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
