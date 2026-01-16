"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  ArrowLeft,
  Loader2,
  Send,
  Upload,
  FileText,
  MessageSquarePlus,
  Sparkles,
  X,
  File,
  Image as ImageIcon,
  RefreshCw,
  ChevronRight,
  Zap,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

interface Prospect {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  status: string;
  evaluation: ProspectEvaluation | null;
}

interface ProspectEvaluation {
  summary: string;
  fitScore: number;
  evaluatedAt: string;
}

interface Source {
  id: string;
  name: string;
  originalName: string | null;
  type: string;
  fileType: string | null;
  blobUrl: string | null;
  processingStatus: string;
  createdAt: string;
  aiSummary?: {
    whatItIs: string;
    keyInsights: string[];
  } | null;
}

export default function ProspectEvalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showAddText, setShowAddText] = useState(false);
  const [prospectReply, setProspectReply] = useState("");
  const [addingReply, setAddingReply] = useState(false);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, uploading, progress } = useFileUpload({
    clientId: params.id,
    onSuccess: (result) => {
      setSources((prev) => [result.source as Source, ...prev]);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      setPendingFileName(null);
    },
  });

  // Save message to database
  const saveMessageToDb = async (role: "user" | "assistant", content: string) => {
    try {
      await fetch(`/api/prospects/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const { messages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, setMessages, append } = useChat({
    api: "/api/chat",
    body: {
      clientId: params.id,
      context: "prospect-eval",
    },
    initialMessages: [],
    onFinish: (message) => {
      // Save assistant response to database
      saveMessageToDb("assistant", message.content);
    },
  });

  // Custom submit that saves user message first
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Save user message to database
    await saveMessageToDb("user", input);

    // Then submit to chat
    originalHandleSubmit(e);
  };

  useEffect(() => {
    fetchProspect();
    fetchSources();
    fetchMessages();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing messages from database
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/prospects/${params.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Clear conversation and start fresh
  const clearConversation = async () => {
    setClearing(true);
    try {
      await fetch(`/api/prospects/${params.id}/messages`, { method: "DELETE" });
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear conversation:", error);
    } finally {
      setClearing(false);
    }
  };

  const fetchProspect = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProspect(data);
      } else {
        router.push("/prospects");
      }
    } catch (error) {
      console.error("Failed to fetch prospect:", error);
      router.push("/prospects");
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}/sources`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFileName(file.name);
    try {
      await uploadFile(file);

      const userMessage = `I've just uploaded a new document: "${file.name}". Please review it and incorporate any relevant information into your evaluation of this prospect.`;

      // Save to database first
      await saveMessageToDb("user", userMessage);

      // Add a system message about the new file
      await append({
        role: "user",
        content: userMessage,
      });
    } catch (error) {
      // Error already handled by hook
    } finally {
      setPendingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddProspectReply = async () => {
    if (!prospectReply.trim()) return;

    setAddingReply(true);
    try {
      const userMessage = `The prospect replied with the following message:\n\n---\n${prospectReply}\n---\n\nPlease analyze this response. What does it tell us? Are there any red flags or positive signals? What follow-up questions should I ask?`;

      // Save to database first
      await saveMessageToDb("user", userMessage);

      // Add the prospect's reply as a user message with context
      await append({
        role: "user",
        content: userMessage,
      });

      setProspectReply("");
      setShowAddText(false);
    } finally {
      setAddingReply(false);
    }
  };

  const startEvaluation = async () => {
    const contextParts = [
      prospect?.company ? `Company: ${prospect.company}` : null,
      prospect?.website ? `Website: ${prospect.website}` : null,
      prospect?.industry ? `Industry: ${prospect.industry}` : null,
      prospect?.description ? `Context: ${prospect.description}` : null,
    ].filter(Boolean);

    const initialPrompt = `I need you to help me evaluate this prospect as a potential consulting client.

${contextParts.length > 0 ? `Here's what I know:\n${contextParts.join("\n")}` : "I don't have much information yet."}

${sources.length > 0 ? `\nI've uploaded ${sources.length} document(s) that should give you context about them.` : ""}

Please start by:
1. Giving me your initial gut reaction - what stands out?
2. What are the most critical questions I should be asking them?
3. What biases should I watch out for in evaluating this opportunity?
4. What tarpit indicators do you see, if any?

Be direct and contrarian. I want honest assessment, not validation.`;

    // Save to database first
    await saveMessageToDb("user", initialPrompt);

    append({
      role: "user",
      content: initialPrompt,
    });
  };

  const deleteSource = async (sourceId: string) => {
    try {
      await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(fileType)) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Prospect not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Link
            href={`/prospects/${params.id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">{prospect.name}</h1>
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Eval Mode
              </Badge>
            </div>
            {prospect.company && (
              <p className="text-sm text-muted-foreground">{prospect.company}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {prospect.evaluation && (
            <Badge
              variant="secondary"
              className={`${
                prospect.evaluation.fitScore >= 7
                  ? "bg-green-500/10 text-green-500"
                  : prospect.evaluation.fitScore >= 5
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              Fit: {prospect.evaluation.fitScore}/10
            </Badge>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              disabled={clearing}
              className="text-muted-foreground hover:text-destructive"
              title="Clear conversation and start fresh"
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Clear</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Add File</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Prospect Evaluation</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  I&apos;ll help you critically evaluate this prospect. I&apos;ll take a contrarian
                  view, watch for tarpit ideas, and help you ask the right questions.
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={startEvaluation} className="gap-2">
                    <Zap className="h-4 w-4" />
                    Start Evaluation
                  </Button>
                  {sources.length === 0 && (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Documents First
                    </Button>
                  )}
                </div>
                <div className="mt-8 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 max-w-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div className="text-left text-sm">
                      <p className="font-medium text-yellow-600">Tarpit Warning Mode Active</p>
                      <p className="text-muted-foreground mt-1">
                        I&apos;ll actively look for ideas that seem attractive but trap
                        entrepreneurs: overcrowded markets, vitamin-not-painkiller problems,
                        and solutions looking for problems.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Add Prospect Reply Panel */}
          {showAddText && (
            <div className="border-t bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  Add Prospect&apos;s Reply
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddText(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Paste the prospect's reply here..."
                value={prospectReply}
                onChange={(e) => setProspectReply(e.target.value)}
                rows={4}
                className="mb-2"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddText(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddProspectReply}
                  disabled={!prospectReply.trim() || addingReply}
                >
                  {addingReply ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Analyze Reply
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4 bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddText(!showAddText)}
                  title="Add prospect's reply"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload document"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about this prospect..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Sidebar - Sources */}
        <div className="w-64 border-l bg-muted/30 overflow-y-auto hidden lg:block">
          <div className="p-3 border-b">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents ({sources.length})
            </h3>
          </div>
          <div className="p-2 space-y-2">
            {sources.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents yet</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  Upload one
                </Button>
              </div>
            ) : (
              sources.map((source) => (
                <div
                  key={source.id}
                  className="group bg-background rounded-lg p-2 border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-muted-foreground">
                      {getFileIcon(source.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {source.processingStatus === "processing" ? (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Processing
                          </Badge>
                        ) : source.processingStatus === "completed" ? (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {source.blobUrl && (
                        <a
                          href={source.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-muted rounded"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
