"use client";

import { useState, useEffect, useCallback } from "react";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Compass,
  Rocket,
  ArrowRight,
  Lightbulb,
  Link2,
  X,
  User,
  Building,
  BookOpen,
  Map,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isPast } from "date-fns";
import { FileUpload } from "@/components/file-upload";
import { SourceAdder } from "@/components/source-adder";
import { TodoQuickAdd } from "@/components/todo-quick-add";
import { DealBadge } from "@/components/deal-badge";
import { NoteDialog } from "@/components/note-dialog";
import { ChatComposer } from "@/components/chat";
import { PhoneInput } from "@/components/ui/phone-input";
import { ClientSignals } from "@/components/client-signals";
import { SharePortalCard } from "@/components/share-portal-card";
import { cn } from "@/lib/utils";

interface AtSomePointItem {
  id: string;
  title: string;
  text?: string;
  createdAt: string;
}

interface ClientLink {
  id: string;
  title: string;
  url: string;
  type?: 'competitor' | 'person' | 'resource' | 'reference' | 'other';
  notes?: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  status: string;
  description: string | null;
  website: string | null;
  dealValue: number | null;
  dealStatus: string | null;
  sourceType: string | null;
  sourceNotes: string | null;
  atSomePoint?: AtSomePointItem[];
  links?: ClientLink[];
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

interface ClarityMethodStatus {
  exists: boolean;
  phase?: string;
  hasStrategicTruth?: boolean;
  lastUpdated?: string;
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  discussion: "bg-cyan-100 text-cyan-700",
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

interface ExecutionPlan {
  id: string;
  title: string;
  status: string;
  timeframe?: string;
  updatedAt: string;
}

interface Roadmap {
  id: string;
  title: string;
  status: string;
  planningHorizon?: string;
  updatedAt: string;
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [clarityMethod, setClarityMethod] = useState<ClarityMethodStatus>({ exists: false });
  const [executionPlans, setExecutionPlans] = useState<ExecutionPlan[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  
  // "At Some Point" and "Links" state
  const [showAddSomePoint, setShowAddSomePoint] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newSomePoint, setNewSomePoint] = useState({ title: "", text: "" });
  const [newLink, setNewLink] = useState({ title: "", url: "", type: "reference" as ClientLink["type"], notes: "" });

  const { messages, append, setMessages, isLoading: chatLoading } = useChat({
    api: "/api/chat",
    body: { clientId: params.id },
  });

  const handleChatSubmit = useCallback((
    message: string,
    options: { personaId?: string; sourceIds?: string[]; attachments?: File[] }
  ) => {
    if (message === "/clear") {
      setMessages([]);
      return;
    }
    append({ role: "user", content: message });
  }, [append, setMessages]);

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
        const [clientRes, sourcesRes, sessionsRes, actionsRes, notesRes, clarityMethodRes, plansRes, roadmapsRes] = await Promise.all([
          fetch(`/api/clients/${params.id}`),
          fetch(`/api/clients/${params.id}/sources`),
          fetch(`/api/sessions?clientId=${params.id}`),
          fetch(`/api/action-items?clientId=${params.id}&status=pending`),
          fetch(`/api/notes?clientId=${params.id}&limit=5`),
          fetch(`/api/clarity-method/${params.id}`),
          fetch(`/api/execution-plans?clientId=${params.id}`),
          fetch(`/api/roadmaps?clientId=${params.id}`),
        ]);

        if (clientRes.ok) setClient(await clientRes.json());
        if (sourcesRes.ok) setSources(await sourcesRes.json());
        if (sessionsRes.ok) setSessions(await sessionsRes.json());
        if (actionsRes.ok) setActionItems(await actionsRes.json());
        if (notesRes.ok) setNotes(await notesRes.json());
        if (plansRes.ok) setExecutionPlans(await plansRes.json());
        if (roadmapsRes.ok) setRoadmaps(await roadmapsRes.json());
        if (clarityMethodRes.ok) {
          const data = await clarityMethodRes.json();
          const canvas = data.canvas;
          setClarityMethod({
            exists: true,
            phase: canvas.phase,
            hasStrategicTruth: !!(
              canvas.strategicTruth?.whoWeAre?.value ||
              canvas.strategicTruth?.whatWeDo?.value ||
              canvas.strategicTruth?.theWedge?.value
            ),
            lastUpdated: canvas.updatedAt,
          });
        }
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

  const handleOpenEditDialog = () => {
    if (client) {
      setEditForm({
        name: client.name,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        company: client.company,
        industry: client.industry,
        website: client.website,
        description: client.description,
        status: client.status,
        sourceType: client.sourceType,
        sourceNotes: client.sourceNotes,
      });
      setShowEditDialog(true);
    }
  };

  const handleSaveClient = async () => {
    if (!client) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updated = await res.json();
        setClient(updated);
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error("Failed to update client:", error);
    } finally {
      setSaving(false);
    }
  };

  // "At Some Point" handlers
  const handleAddSomePoint = async () => {
    if (!client || !newSomePoint.title.trim()) return;
    const newItem: AtSomePointItem = {
      id: crypto.randomUUID(),
      title: newSomePoint.title.trim(),
      text: newSomePoint.text.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...(client.atSomePoint || []), newItem];
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atSomePoint: updated }),
      });
      if (res.ok) {
        setClient({ ...client, atSomePoint: updated });
        setNewSomePoint({ title: "", text: "" });
        setShowAddSomePoint(false);
      }
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleDeleteSomePoint = async (id: string) => {
    if (!client) return;
    const updated = (client.atSomePoint || []).filter(item => item.id !== id);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atSomePoint: updated }),
      });
      if (res.ok) {
        setClient({ ...client, atSomePoint: updated });
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  // "Links" handlers
  const handleAddLink = async () => {
    if (!client || !newLink.title.trim() || !newLink.url.trim()) return;
    let url = newLink.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const newItem: ClientLink = {
      id: crypto.randomUUID(),
      title: newLink.title.trim(),
      url,
      type: newLink.type,
      notes: newLink.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...(client.links || []), newItem];
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updated }),
      });
      if (res.ok) {
        setClient({ ...client, links: updated });
        setNewLink({ title: "", url: "", type: "reference", notes: "" });
        setShowAddLink(false);
      }
    } catch (error) {
      console.error("Failed to add link:", error);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!client) return;
    const updated = (client.links || []).filter(link => link.id !== id);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updated }),
      });
      if (res.ok) {
        setClient({ ...client, links: updated });
      }
    } catch (error) {
      console.error("Failed to delete link:", error);
    }
  };

  const getLinkIcon = (type?: ClientLink["type"]) => {
    switch (type) {
      case "competitor": return Building;
      case "person": return User;
      case "resource": return BookOpen;
      default: return Link2;
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
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold">{client.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleOpenEditDialog}
                  title="Edit client details"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
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
                <p className="text-sm sm:text-base text-muted-foreground">
                  {client.company}{client.company && client.industry && " · "}{client.industry}
                </p>
              )}
              {client.description && (
                <p className="mt-2 text-sm max-w-2xl">{client.description}</p>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              <Link href={`/clients/${client.id}/clarity`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="gap-2 w-full sm:w-auto" size="sm">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Clarity Doc</span>
                  <span className="sm:hidden">Doc</span>
                </Button>
              </Link>
              <Link href={`/methods/clarity/${client.id}`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="gap-2 w-full sm:w-auto" size="sm">
                  <Compass className="h-4 w-4" />
                  <span className="hidden sm:inline">Clarity Method</span>
                  <span className="sm:hidden">Method</span>
                  {clarityMethod.hasStrategicTruth && (
                    <Badge variant="secondary" className="text-xs ml-1 hidden sm:inline-flex">
                      {clarityMethod.phase}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href={`/session/new?client=${client.id}`} className="flex-1 sm:flex-none">
                <Button className="gap-2 w-full sm:w-auto" size="sm">
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">Start Session</span>
                  <span className="sm:hidden">Session</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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
                          <Link
                            href={`/sources/${source.id}`}
                            className="text-sm font-medium truncate hover:text-primary hover:underline block"
                          >
                            {source.name}
                          </Link>
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
                          <Link href={`/sources/${source.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100">
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
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

          {/* Methods / Plans */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rocket className="h-5 w-5 text-orange-500" />
                Methods & Plans
              </CardTitle>
              <Link href={`/methods/do-the-thing?client=${client.id}`}>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" />
                  New Plan
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clarity Method */}
              <Link
                href={`/methods/clarity/${client.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Compass className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Clarity Method™</p>
                  <p className="text-xs text-muted-foreground">
                    {clarityMethod.exists 
                      ? `${clarityMethod.phase} · ${clarityMethod.hasStrategicTruth ? "Strategic truth defined" : "In progress"}`
                      : "Not started"
                    }
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {/* Execution Plans */}
              {executionPlans.length > 0 ? (
                <div className="space-y-2">
                  {executionPlans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/methods/do-the-thing/${plan.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Rocket className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.timeframe && `${plan.timeframe} · `}
                          {formatDistanceToNow(new Date(plan.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        plan.status === "active" && "bg-green-500/20 text-green-500",
                        plan.status === "draft" && "bg-yellow-500/20 text-yellow-500",
                        plan.status === "completed" && "bg-blue-500/20 text-blue-500"
                      )}>
                        {plan.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <p>No execution plans yet</p>
                  <Link href={`/methods/do-the-thing`}>
                    <Button size="sm" variant="link" className="mt-1">
                      Create a "Do The Thing" plan
                    </Button>
                  </Link>
                </div>
              )}

              {/* Roadmap Builder */}
              {roadmaps.length > 0 ? (
                <div className="space-y-2">
                  {roadmaps.map((roadmap) => (
                    <Link
                      key={roadmap.id}
                      href={`/methods/roadmap/${roadmap.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Map className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{roadmap.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {roadmap.planningHorizon && `${roadmap.planningHorizon} · `}
                          {formatDistanceToNow(new Date(roadmap.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        roadmap.status === "active" && "bg-green-500/20 text-green-500",
                        roadmap.status === "draft" && "bg-yellow-500/20 text-yellow-500",
                        roadmap.status === "completed" && "bg-blue-500/20 text-blue-500"
                      )}>
                        {roadmap.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href={`/methods/roadmap?client=${client.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Map className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Roadmap Builder</p>
                    <p className="text-xs text-muted-foreground">Create a visual product roadmap</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
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

          {/* At Some Point - Dumping ground for ideas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                At Some Point
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowAddSomePoint(!showAddSomePoint)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {showAddSomePoint && (
                <div className="mb-4 pb-4 border-b space-y-3">
                  <Input
                    placeholder="Title / Quick thought..."
                    value={newSomePoint.title}
                    onChange={(e) => setNewSomePoint({ ...newSomePoint, title: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddSomePoint()}
                  />
                  <Textarea
                    placeholder="More details (optional)..."
                    value={newSomePoint.text}
                    onChange={(e) => setNewSomePoint({ ...newSomePoint, text: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSomePoint} disabled={!newSomePoint.title.trim()}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setShowAddSomePoint(false);
                      setNewSomePoint({ title: "", text: "" });
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {client.atSomePoint && client.atSomePoint.length > 0 ? (
                <div className="space-y-3">
                  {client.atSomePoint.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.text && (
                            <p className="text-sm text-muted-foreground mt-1">{item.text}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSomePoint(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    A place for future ideas & things to revisit
                  </p>
                  {!showAddSomePoint && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setShowAddSomePoint(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add first idea
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links - Reference links */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500" />
                Links
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setShowAddLink(!showAddLink)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {showAddLink && (
                <div className="mb-4 pb-4 border-b space-y-3">
                  <Input
                    placeholder="Link title..."
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  />
                  <Input
                    placeholder="URL..."
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  />
                  <div className="flex gap-2">
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={newLink.type}
                      onChange={(e) => setNewLink({ ...newLink, type: e.target.value as ClientLink["type"] })}
                    >
                      <option value="reference">Reference</option>
                      <option value="competitor">Competitor</option>
                      <option value="person">Person</option>
                      <option value="resource">Resource</option>
                      <option value="other">Other</option>
                    </select>
                    <Input
                      placeholder="Notes (optional)..."
                      value={newLink.notes}
                      onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddLink} disabled={!newLink.title.trim() || !newLink.url.trim()}>
                      Add Link
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setShowAddLink(false);
                      setNewLink({ title: "", url: "", type: "reference", notes: "" });
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {client.links && client.links.length > 0 ? (
                <div className="space-y-2">
                  {client.links.map((link) => {
                    const LinkIcon = getLinkIcon(link.type);
                    return (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          link.type === "competitor" && "bg-red-500/10 text-red-500",
                          link.type === "person" && "bg-green-500/10 text-green-500",
                          link.type === "resource" && "bg-purple-500/10 text-purple-500",
                          (!link.type || link.type === "reference" || link.type === "other") && "bg-blue-500/10 text-blue-500"
                        )}>
                          <LinkIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline flex items-center gap-1"
                          >
                            {link.title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {link.notes && (
                            <p className="text-xs text-muted-foreground truncate">{link.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {link.type || "reference"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Competitors, people, resources & references
                  </p>
                  {!showAddLink && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setShowAddLink(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add first link
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Signals - AI-powered insights and call agenda */}
          <div className="lg:col-span-2">
            <ClientSignals clientId={params.id} clientName={client.name} />
          </div>

          {/* Client Portal - External Sharing */}
          <SharePortalCard
            clientId={params.id}
            clientName={client.name}
            shareableItems={[
              // Add Clarity Canvas if exists
              ...(clarityMethod.exists
                ? [
                    {
                      id: params.id,
                      type: "clarity_canvas" as const,
                      title: "Clarity Method Canvas",
                      status: clarityMethod.phase,
                    },
                  ]
                : []),
              // Add execution plans
              ...executionPlans.map((plan) => ({
                id: plan.id,
                type: "execution_plan" as const,
                title: plan.title,
                status: plan.status,
              })),
              // Add roadmaps
              ...roadmaps.map((roadmap) => ({
                id: roadmap.id,
                type: "roadmap" as const,
                title: roadmap.title,
                status: roadmap.status,
              })),
            ]}
          />

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
                <ChatComposer
                  onSubmit={handleChatSubmit}
                  sources={sources.map(s => ({ id: s.id, name: s.name, type: s.type }))}
                  selectedClient={params.id}
                  isLoading={chatLoading}
                  placeholder="Ask about this client... Use @ # /"
                  compact
                  showAttachments={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Client Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client details and contact information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName || ""}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName || ""}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Client display name"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  value={editForm.phone || ""}
                  onChange={(value) => setEditForm({ ...editForm, phone: value })}
                  placeholder="555-123-4567"
                />
              </div>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editForm.company || ""}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={editForm.industry || ""}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={editForm.website || ""}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description of the client or engagement..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.status || "prospect"}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="prospect_lost">Prospect Lost</option>
                <option value="client_cancelled">Client Cancelled</option>
              </select>
            </div>

            {/* Source Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Lead Source</Label>
                <select
                  id="sourceType"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.sourceType || ""}
                  onChange={(e) => setEditForm({ ...editForm, sourceType: e.target.value })}
                >
                  <option value="">Select source...</option>
                  <option value="referral">Referral</option>
                  <option value="inbound">Inbound</option>
                  <option value="outreach">Outreach</option>
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceNotes">Source Notes</Label>
                <Input
                  id="sourceNotes"
                  value={editForm.sourceNotes || ""}
                  onChange={(e) => setEditForm({ ...editForm, sourceNotes: e.target.value })}
                  placeholder="How did they find you?"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
