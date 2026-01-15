"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Calendar,
  Clock,
  Inbox,
  Archive,
  CheckCircle,
  Search,
  Plus,
  ArrowRight,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface TranscriptUpload {
  id: string;
  title: string | null;
  content: string;
  sessionDate: string | null;
  duration: number | null;
  notes: string | null;
  sourceType: string;
  originalFilename: string | null;
  status: string;
  clientId: string | null;
  sessionId: string | null;
  client: Client | null;
  session: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<TranscriptUpload[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptUpload | null>(null);
  const [filter, setFilter] = useState<"inbox" | "assigned" | "archived">("inbox");
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New transcript form state
  const [newTranscript, setNewTranscript] = useState({
    content: "",
    title: "",
  });

  // Assignment form state
  const [assignForm, setAssignForm] = useState({
    clientId: "",
    title: "",
    sessionDate: new Date().toISOString().split("T")[0],
    sessionTime: "09:00",
    duration: "",
  });

  useEffect(() => {
    fetchTranscripts();
    fetchClients();
  }, [filter]);

  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transcripts?status=${filter}`);
      const data = await res.json();
      setTranscripts(data);
    } catch (error) {
      console.error("Failed to fetch transcripts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const handleCreateTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTranscript.content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTranscript.content,
          title: newTranscript.title || undefined,
          sourceType: "paste",
        }),
      });

      if (res.ok) {
        setNewTranscript({ content: "", title: "" });
        setShowNewForm(false);
        fetchTranscripts();
      }
    } catch (error) {
      console.error("Failed to create transcript:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignToSession = async () => {
    if (!selectedTranscript || !assignForm.clientId) return;

    setSubmitting(true);
    try {
      const sessionDate = new Date(`${assignForm.sessionDate}T${assignForm.sessionTime}`);

      const res = await fetch(`/api/transcripts/${selectedTranscript.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_to_session",
          clientId: assignForm.clientId,
          title: assignForm.title || selectedTranscript.title,
          sessionDate: sessionDate.toISOString(),
          duration: assignForm.duration ? parseInt(assignForm.duration) : undefined,
        }),
      });

      if (res.ok) {
        fetchTranscripts();
        setSelectedTranscript(null);
        setAssignForm({
          clientId: "",
          title: "",
          sessionDate: new Date().toISOString().split("T")[0],
          sessionTime: "09:00",
          duration: "",
        });
      }
    } catch (error) {
      console.error("Failed to assign transcript:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`/api/transcripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      fetchTranscripts();
      setSelectedTranscript(null);
    } catch (error) {
      console.error("Failed to archive transcript:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transcript?")) return;

    try {
      await fetch(`/api/transcripts/${id}`, { method: "DELETE" });
      fetchTranscripts();
      setSelectedTranscript(null);
    } catch (error) {
      console.error("Failed to delete transcript:", error);
    }
  };

  // When a transcript is selected, populate the assign form
  useEffect(() => {
    if (selectedTranscript) {
      setAssignForm({
        clientId: selectedTranscript.clientId || "",
        title: selectedTranscript.title || "",
        sessionDate: selectedTranscript.sessionDate
          ? new Date(selectedTranscript.sessionDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        sessionTime: selectedTranscript.sessionDate
          ? format(new Date(selectedTranscript.sessionDate), "HH:mm")
          : "09:00",
        duration: selectedTranscript.duration?.toString() || "",
      });
    }
  }, [selectedTranscript]);

  return (
    <div className="flex h-full">
      {/* Transcript List */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Transcripts</h1>
            <Button size="sm" onClick={() => setShowNewForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex gap-2 mb-4">
            {(["inbox", "assigned", "archived"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : transcripts.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transcripts in {filter}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Paste a transcript to get started
              </p>
            </div>
          ) : (
            transcripts.map((transcript) => (
              <button
                key={transcript.id}
                onClick={() => setSelectedTranscript(transcript)}
                className={`w-full p-4 text-left border-b border-border hover:bg-accent/50 transition-colors ${
                  selectedTranscript?.id === transcript.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium truncate">
                    {transcript.title || "Untitled Transcript"}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(transcript.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {transcript.content.slice(0, 100)}...
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {Math.ceil(transcript.content.length / 1000)}k chars
                  </Badge>
                  {transcript.client && (
                    <Badge variant="outline" className="text-xs">
                      {transcript.client.name}
                    </Badge>
                  )}
                  {transcript.status === "assigned" && (
                    <Badge className="text-xs bg-green-500/10 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Assigned
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail / New Form */}
      <div className="flex-1 overflow-auto">
        {showNewForm ? (
          <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Paste New Transcript</h2>
            <form onSubmit={handleCreateTranscript} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="AI will generate a title if not provided"
                  value={newTranscript.title}
                  onChange={(e) =>
                    setNewTranscript({ ...newTranscript, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Transcript Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Paste your transcript here..."
                  className="min-h-[400px] font-mono text-sm"
                  value={newTranscript.content}
                  onChange={(e) =>
                    setNewTranscript({ ...newTranscript, content: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !newTranscript.content.trim()}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Transcript
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewTranscript({ content: "", title: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : selectedTranscript ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {selectedTranscript.title || "Untitled Transcript"}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {Math.ceil(selectedTranscript.content.length / 1000)}k characters
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(selectedTranscript.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedTranscript.status !== "archived" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(selectedTranscript.id)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(selectedTranscript.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Session link if assigned */}
            {selectedTranscript.session && (
              <Card className="mb-6 border-green-500/20 bg-green-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">
                        Assigned to: {selectedTranscript.session.title}
                      </span>
                    </div>
                    <Link href={`/session/${selectedTranscript.sessionId}`}>
                      <Button size="sm" variant="outline">
                        View Session
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript Content */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Transcript Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm font-mono max-h-[300px] overflow-auto">
                  {selectedTranscript.content}
                </div>
              </CardContent>
            </Card>

            {/* Assignment Form (only for inbox) */}
            {selectedTranscript.status === "inbox" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Assign to Client & Create Session</CardTitle>
                  <CardDescription>
                    Create a historic session from this transcript. It will be indexed for search
                    and AI insights will be extracted.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client *</Label>
                    <select
                      id="client"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignForm.clientId}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, clientId: e.target.value })
                      }
                    >
                      <option value="">Select client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.company && `(${client.company})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTitle">Session Title</Label>
                    <Input
                      id="sessionTitle"
                      placeholder={selectedTranscript.title || "Session title..."}
                      value={assignForm.title}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionDate">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Session Date
                      </Label>
                      <Input
                        id="sessionDate"
                        type="date"
                        value={assignForm.sessionDate}
                        onChange={(e) =>
                          setAssignForm({ ...assignForm, sessionDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionTime">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Start Time
                      </Label>
                      <Input
                        id="sessionTime"
                        type="time"
                        value={assignForm.sessionTime}
                        onChange={(e) =>
                          setAssignForm({ ...assignForm, sessionTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="e.g., 60"
                      value={assignForm.duration}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, duration: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={handleAssignToSession}
                    disabled={submitting || !assignForm.clientId}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Historic Session & Process
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a transcript to view</p>
              <p className="text-sm mt-2">or paste a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
