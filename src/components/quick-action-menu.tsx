"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  StickyNote,
  Mic,
  Upload,
  CheckSquare,
  Loader2,
  Sparkles,
  Pin,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";

interface Client {
  id: string;
  name: string;
  company?: string | null;
  status: string;
}

type QuickActionType = "note" | "session" | "upload" | "task" | null;

const NOTE_TYPES = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-700" },
  { value: "future", label: "Future", color: "bg-blue-100 text-blue-700" },
  { value: "competitor", label: "Competitor", color: "bg-red-100 text-red-700" },
  { value: "partner", label: "Partner", color: "bg-green-100 text-green-700" },
  { value: "idea", label: "Idea", color: "bg-purple-100 text-purple-700" },
  { value: "reference", label: "Reference", color: "bg-amber-100 text-amber-700" },
] as const;

interface UploadingFile {
  file: File;
  status: "uploading" | "complete" | "error";
  error?: string;
}

export function QuickActionMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickActionType>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Keyboard shortcut to open menu (Cmd+.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setOpen((prev) => !prev);
        if (!open) {
          setActiveAction(null);
        }
      }
      if (e.key === "Escape" && open) {
        if (activeAction) {
          setActiveAction(null);
        } else {
          setOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeAction]);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fetch clients when menu opens
  useEffect(() => {
    if (open && clients.length === 0) {
      setLoadingClients(true);
      fetch("/api/clients")
        .then((res) => res.json())
        .then((data) => setClients(data))
        .catch(console.error)
        .finally(() => setLoadingClients(false));
    }
  }, [open, clients.length]);

  const handleSelectAction = (action: QuickActionType) => {
    setActiveAction(action);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveAction(null);
  };

  const handleSuccess = () => {
    handleClose();
  };

  const actions = [
    {
      id: "note" as const,
      label: "Quick Note",
      icon: StickyNote,
      description: "Capture a thought or observation",
      color: "bg-amber-500",
    },
    {
      id: "session" as const,
      label: "Quick Session",
      icon: Mic,
      description: "Start a new recording session",
      color: "bg-green-500",
    },
    {
      id: "upload" as const,
      label: "Quick Upload",
      icon: Upload,
      description: "Upload a document",
      color: "bg-blue-500",
    },
    {
      id: "task" as const,
      label: "Quick Task",
      icon: CheckSquare,
      description: "Add an action item",
      color: "bg-purple-500",
    },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Quick add...</span>
        <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-muted text-xs">⌘.</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 flex flex-col max-h-[90vh]">
        <div className="bg-card border-2 border-border rounded-2xl shadow-corporate-lg overflow-hidden flex flex-col max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                {activeAction
                  ? actions.find((a) => a.id === activeAction)?.label
                  : "Quick Add"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {activeAction && (
                <button
                  onClick={() => setActiveAction(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeAction === null ? (
              <div className="grid grid-cols-2 gap-3">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-center group"
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center text-white",
                        action.color
                      )}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : activeAction === "note" ? (
              <QuickNoteForm clients={clients} onSuccess={handleSuccess} />
            ) : activeAction === "session" ? (
              <QuickSessionForm
                clients={clients}
                onSuccess={handleSuccess}
                router={router}
              />
            ) : activeAction === "upload" ? (
              <QuickUploadForm clients={clients} onSuccess={handleSuccess} />
            ) : activeAction === "task" ? (
              <QuickTaskForm clients={clients} onSuccess={handleSuccess} />
            ) : null}
          </div>

          {/* Footer */}
          {!activeAction && (
            <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground flex-shrink-0">
              <span>
                <kbd className="px-1 py-0.5 rounded bg-muted">⌘.</kbd> to toggle
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-muted">esc</kbd> to close
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Quick Note Form
function QuickNoteForm({
  clients,
  onSuccess,
}: {
  clients: Client[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string>("");
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

  const handleSubmit = async () => {
    if (!content.trim() || !clientId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          content: content.trim(),
          noteType,
          labels: labels.length > 0 ? labels : undefined,
          isPinned,
          extractTodos,
          generateTitle: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create note");
      onSuccess();
    } catch (error) {
      console.error("Failed to create note:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Client Selector */}
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.company && `(${c.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Note Content */}
      <div className="space-y-2">
        <Label>Note Content *</Label>
        <Textarea
          placeholder="Write your note here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="resize-none"
          autoFocus
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
                  onClick={() => setLabels(labels.filter((l) => l !== label))}
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
          Extract tasks
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading || !content.trim() || !clientId}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Note
        </Button>
      </div>
    </div>
  );
}

// Quick Session Form
function QuickSessionForm({
  clients,
  onSuccess,
  router,
}: {
  clients: Client[];
  onSuccess: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");

  const handleSubmit = async () => {
    if (!clientId || !title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: title.trim(),
          gameplan: [],
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const session = await res.json();

      // Start session immediately
      await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      onSuccess();
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Client Selector */}
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.company && `(${c.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Session Title */}
      <div className="space-y-2">
        <Label>Session Title *</Label>
        <Input
          placeholder="e.g., Q1 Strategy Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <p className="text-sm text-muted-foreground">
        This will start a new recording session immediately. You can add a gameplan
        from within the session.
      </p>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading || !clientId || !title.trim()}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Start Session
        </Button>
      </div>
    </div>
  );
}

// Quick Upload Form
function QuickUploadForm({
  clients,
  onSuccess,
}: {
  clients: Client[];
  onSuccess: () => void;
}) {
  const [clientId, setClientId] = useState<string>("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [allComplete, setAllComplete] = useState(false);

  const uploadFile = async (file: File) => {
    if (!clientId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      return await res.json();
    } catch (error) {
      throw error;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!clientId) return;

      const newFiles = acceptedFiles.map((file) => ({
        file,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      for (const file of acceptedFiles) {
        try {
          await uploadFile(file);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: "complete" } : f
            )
          );
        } catch {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, status: "error", error: "Upload failed" }
                : f
            )
          );
        }
      }
    },
    [clientId]
  );

  // Check if all uploads are complete
  useEffect(() => {
    if (
      uploadingFiles.length > 0 &&
      uploadingFiles.every((f) => f.status === "complete" || f.status === "error")
    ) {
      setAllComplete(true);
    }
  }, [uploadingFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !clientId,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
  });

  return (
    <div className="space-y-4">
      {/* Client Selector */}
      <div className="space-y-2">
        <Label>Client *</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.company && `(${c.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          !clientId && "opacity-50 cursor-not-allowed",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        {isDragActive ? (
          <p className="text-sm text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {clientId
                ? "Drag & drop files here, or click to select"
                : "Select a client first"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, PPTX, TXT, MD, CSV, Images
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-accent/30"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{f.file.name}</span>
              {f.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {f.status === "complete" && (
                <Check className="h-4 w-4 text-green-500" />
              )}
              {f.status === "error" && <X className="h-4 w-4 text-red-500" />}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Files will be processed for RAG and available in the client&apos;s knowledge
        base.
      </p>

      {/* Done Button */}
      {allComplete && (
        <div className="flex justify-end">
          <Button onClick={onSuccess}>Done</Button>
        </div>
      )}
    </div>
  );
}

// Quick Task Form
function QuickTaskForm({
  clients,
  onSuccess,
}: {
  clients: Client[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          dueDate: dueDate?.toISOString(),
          clientId: clientId || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create task");
      onSuccess();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Title */}
      <div className="space-y-2">
        <Label>Task *</Label>
        <Input
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          autoFocus
        />
      </div>

      {/* Client Selector (optional for tasks) */}
      <div className="space-y-2">
        <Label>Client (optional)</Label>
        <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="No client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.company && `(${c.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority & Due Date */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Priority */}
        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-1">
          <Label className="text-xs">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 justify-start",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Task
        </Button>
      </div>
    </div>
  );
}
