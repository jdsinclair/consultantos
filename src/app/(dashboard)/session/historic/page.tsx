"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Loader2,
  History,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface AttachmentFile {
  id: string;
  file: File;
  type: "whiteboard" | "document" | "image" | "recording" | "other";
  description: string;
  preview?: string;
}

const attachmentTypes = [
  { value: "whiteboard", label: "Whiteboard", icon: ImageIcon },
  { value: "document", label: "Document", icon: FileText },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "recording", label: "Recording", icon: Video },
  { value: "other", label: "Other", icon: File },
];

export default function AddHistoricSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const [formData, setFormData] = useState({
    clientId: preselectedClientId || "",
    title: "",
    sessionDate: new Date().toISOString().split("T")[0], // Default to today
    sessionTime: "09:00",
    duration: "", // in minutes
    transcript: "",
    notes: "",
    recordingUrl: "",
    summary: "",
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    for (const file of files) {
      const type = guessFileType(file);
      const attachment: AttachmentFile = {
        id: `${Date.now()}-${newAttachments.length}`,
        file,
        type,
        description: "",
        preview: type === "image" || type === "whiteboard" ? URL.createObjectURL(file) : undefined,
      };
      newAttachments.push(attachment);
    }

    setAttachments([...attachments, ...newAttachments]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const guessFileType = (file: File): AttachmentFile["type"] => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return "image";
    }
    if (["mp4", "mov", "webm", "avi", "mp3", "wav", "m4a"].includes(ext)) {
      return "recording";
    }
    if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md"].includes(ext)) {
      return "document";
    }
    return "other";
  };

  const updateAttachment = (id: string, updates: Partial<AttachmentFile>) => {
    setAttachments(
      attachments.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const removeAttachment = (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build FormData
      const fd = new FormData();

      // Add session data as JSON
      const sessionDate = new Date(`${formData.sessionDate}T${formData.sessionTime}`);
      const sessionData = {
        clientId: formData.clientId,
        title: formData.title,
        sessionDate: sessionDate.toISOString(),
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        transcript: formData.transcript || undefined,
        notes: formData.notes || undefined,
        recordingUrl: formData.recordingUrl || undefined,
        summary: formData.summary || undefined,
      };
      fd.append("data", JSON.stringify(sessionData));

      // Add files with their types and descriptions
      attachments.forEach((att, index) => {
        fd.append(`file_${index}`, att.file);
        fd.append(`type_${index}`, att.type);
        fd.append(`desc_${index}`, att.description);
      });

      const res = await fetch("/api/sessions/historic", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create session");
      }

      const session = await res.json();
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error("Failed to create historic session:", error);
      alert(error instanceof Error ? error.message : "Failed to create session");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/session"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add Historic Session</h1>
            <p className="text-muted-foreground">
              Import a past session with transcript, notes, and materials
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required
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
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                placeholder="e.g., GTM Strategy Workshop"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionDate">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Session Date *
                </Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  required
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
                  value={formData.sessionTime}
                  onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 60"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>
              Paste the session transcript or meeting notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your transcript here... The system will automatically extract action items."
              className="min-h-[200px] font-mono text-sm"
              value={formData.transcript}
              onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Notes & Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Session Notes</Label>
              <Textarea
                id="notes"
                placeholder="Your personal notes from the session..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Session Summary</Label>
              <Textarea
                id="summary"
                placeholder="Brief summary of what was discussed and decided..."
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordingUrl">Recording URL (optional)</Label>
              <Input
                id="recordingUrl"
                type="url"
                placeholder="https://..."
                value={formData.recordingUrl}
                onChange={(e) => setFormData({ ...formData, recordingUrl: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Session Materials</CardTitle>
            <CardDescription>
              Upload whiteboard images, documents, and other materials from the session.
              These will be automatically added to Sources for RAG.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, PDFs, documents, recordings
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.mp3,.mp4,.wav,.m4a"
              />
            </div>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="space-y-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex gap-4 p-3 border rounded-lg bg-card"
                  >
                    {/* Preview */}
                    <div className="flex-shrink-0 w-20 h-20 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {att.preview ? (
                        <img
                          src={att.preview}
                          alt={att.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {att.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(att.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeAttachment(att.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <select
                          className="h-8 text-xs rounded border border-input bg-background px-2"
                          value={att.type}
                          onChange={(e) =>
                            updateAttachment(att.id, {
                              type: e.target.value as AttachmentFile["type"],
                            })
                          }
                        >
                          {attachmentTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          className="h-8 text-xs flex-1"
                          placeholder="Description (optional)"
                          value={att.description}
                          onChange={(e) =>
                            updateAttachment(att.id, { description: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={loading || !formData.clientId || !formData.title}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Historic Session
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
