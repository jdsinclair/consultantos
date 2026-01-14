"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  Send,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Target,
  Clock,
  Square,
  Loader2,
  Plus,
  History,
  FileText,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Calendar,
  ArrowLeft,
  Monitor,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useChat } from "ai/react";
import { AudioVisualizer, AudioLevel } from "@/components/audio-visualizer";
import {
  RealtimeTranscription,
  TranscriptSegment,
  TranscriptionStatus,
  AudioSource,
} from "@/lib/transcription";

interface GameplanItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

interface SessionAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  blobUrl: string;
  type: 'whiteboard' | 'document' | 'image' | 'recording' | 'other';
  description?: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  isHistoric: boolean;
  gameplan: GameplanItem[] | null;
  transcript: string | null;
  transcriptChunks: { text: string; timestamp: string }[] | null;
  notes: string | null;
  summary: string | null;
  recordingUrl: string | null;
  attachments: SessionAttachment[] | null;
  startedAt: string | null;
  sessionDate: string | null;
  duration: number | null;
  client: {
    id: string;
    name: string;
    company: string | null;
  };
  method: {
    id: string;
    name: string;
  } | null;
  actionItems?: Array<{
    id: string;
    title: string;
    status: string;
    ownerType: string;
  }>;
}

interface Suggestion {
  id: string;
  type: string;
  content: string;
  priority: string;
  acted: boolean;
}

export default function LiveSessionPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameplan, setGameplan] = useState<GameplanItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [detectedCommitments, setDetectedCommitments] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newCommitment, setNewCommitment] = useState("");
  const lastTranscriptLength = useRef(0);

  // Audio transcription state
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>("idle");
  const [audioSource, setAudioSource] = useState<AudioSource>("microphone");
  const [liveTranscript, setLiveTranscript] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const transcriptionRef = useRef<RealtimeTranscription | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      sessionId: params.id,
      clientId: session?.client?.id,
    },
  });

  // Fetch session data
  useEffect(() => {
    fetch(`/api/sessions/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data);
        setGameplan(data.gameplan || []);
        if (data.status === "live") {
          setIsRecording(true);
        }
      });
  }, [params.id]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && session?.startedAt) {
      const startTime = new Date(session.startedAt).getTime();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, session?.startedAt]);

  // Cleanup transcription on unmount
  useEffect(() => {
    return () => {
      if (transcriptionRef.current) {
        transcriptionRef.current.stop();
      }
    };
  }, []);

  // Fetch AI suggestions periodically when recording
  useEffect(() => {
    if (!isRecording || !session?.client?.id) return;

    const fetchSuggestions = async () => {
      // Only fetch if transcript has grown
      const currentLength = session?.transcript?.length || 0;
      if (currentLength <= lastTranscriptLength.current + 50) return;

      lastTranscriptLength.current = currentLength;
      setLoadingSuggestions(true);

      try {
        const res = await fetch("/api/session/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: params.id,
            clientId: session.client.id,
            transcript: session.transcript?.slice(-2000) || "", // Last 2000 chars
            gameplan: gameplan.filter((g) => !g.done).map((g) => g.text),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.suggestions?.length > 0) {
            setSuggestions((prev) => {
              // Avoid duplicates
              const existingContent = new Set(prev.map((s) => s.content));
              const newSuggestions = data.suggestions.filter(
                (s: Suggestion) => !existingContent.has(s.content)
              );
              return [...newSuggestions, ...prev].slice(0, 10);
            });
          }
          if (data.commitments?.length > 0) {
            setDetectedCommitments((prev) => {
              const existing = new Set(prev);
              const newCommitments = data.commitments.filter(
                (c: string) => !existing.has(c)
              );
              return [...prev, ...newCommitments];
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const interval = setInterval(fetchSuggestions, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [isRecording, session?.client?.id, session?.transcript, params.id, gameplan]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleGameplanItem = async (id: string) => {
    const updated = gameplan.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setGameplan(updated);

    await fetch(`/api/sessions/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameplan: updated }),
    });
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const actOnSuggestion = async (suggestion: Suggestion) => {
    if (suggestion.type === "commitment") {
      // Add to detected commitments
      setDetectedCommitments((prev) => [...prev, suggestion.content]);
    }
    dismissSuggestion(suggestion.id);
  };

  const addManualCommitment = () => {
    if (!newCommitment.trim()) return;
    setDetectedCommitments((prev) => [...prev, newCommitment.trim()]);
    setNewCommitment("");
  };

  const saveCommitmentAsAction = async (commitment: string) => {
    if (!session?.client?.id) return;

    try {
      await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.client.id,
          sessionId: params.id,
          title: commitment,
          source: "session",
        }),
      });
      // Remove from detected after saving
      setDetectedCommitments((prev) => prev.filter((c) => c !== commitment));
    } catch (error) {
      console.error("Failed to save action item:", error);
    }
  };

  const startRecording = async () => {
    // Update session status first
    await fetch(`/api/sessions/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "live", startedAt: new Date().toISOString() }),
    });
    setIsRecording(true);
    setSession((prev) => prev ? { ...prev, startedAt: new Date().toISOString() } : prev);

    // Initialize transcription
    transcriptionRef.current = new RealtimeTranscription({
      onTranscript: (segment: TranscriptSegment) => {
        if (segment.isFinal) {
          setLiveTranscript((prev) => [...prev, segment]);
          setInterimTranscript("");
          // Also update session transcript for AI suggestions
          setSession((prev) => {
            if (!prev) return prev;
            const newTranscript = (prev.transcript || "") + `\n${segment.speaker}: ${segment.text}`;
            return { ...prev, transcript: newTranscript };
          });
        } else {
          setInterimTranscript(segment.text);
        }
      },
      onError: (error: Error) => {
        console.error("Transcription error:", error);
        // Show error to user but don't stop recording
      },
      onStreamReady: (stream: MediaStream) => {
        setAudioStream(stream);
      },
      onStatusChange: (status: TranscriptionStatus) => {
        setTranscriptionStatus(status);
      },
    });

    // Start with selected audio source
    await transcriptionRef.current.start(audioSource);
  };

  const endSession = async () => {
    // Stop transcription
    if (transcriptionRef.current) {
      transcriptionRef.current.stop();
      transcriptionRef.current = null;
    }
    setAudioStream(null);

    // Save all remaining commitments as action items
    for (const commitment of detectedCommitments) {
      await saveCommitmentAsAction(commitment);
    }

    // Build final transcript from segments
    const finalTranscript = liveTranscript
      .map((seg) => `${seg.speaker}: ${seg.text}`)
      .join("\n");

    await fetch(`/api/sessions/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        endedAt: new Date().toISOString(),
        transcript: finalTranscript || session?.transcript,
      }),
    });
    setIsRecording(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'whiteboard':
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'recording':
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Historic Session View
  if (session.isHistoric || session.status === "completed") {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Link
          href="/session"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {session.isHistoric && (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{session.title}</h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <Link href={`/clients/${session.client.id}`} className="hover:text-primary">
                      {session.client.name}
                      {session.client.company && ` (${session.client.company})`}
                    </Link>
                    {(session.sessionDate || session.startedAt) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(session.sessionDate || session.startedAt!), "MMM d, yyyy")}
                      </span>
                    )}
                    {session.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(session.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Badge variant={session.isHistoric ? "secondary" : "default"}>
              {session.isHistoric ? "Historic" : "Completed"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Summary */}
            {session.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{session.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {session.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Transcript */}
            {session.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap max-h-96 overflow-auto bg-muted/30 p-4 rounded-lg font-mono">
                    {session.transcript}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {session.attachments && session.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {session.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors group"
                      >
                        {att.type === 'whiteboard' || att.type === 'image' ? (
                          <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0">
                            <img
                              src={att.blobUrl}
                              alt={att.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            {getAttachmentIcon(att.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{att.filename}</p>
                          <p className="text-xs text-muted-foreground capitalize">{att.type}</p>
                          {att.description && (
                            <p className="text-xs text-muted-foreground truncate">{att.description}</p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recording */}
            {session.recordingUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={session.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Recording
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {session.actionItems && session.actionItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Action Items ({session.actionItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.actionItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                          item.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                        }`} />
                        <div>
                          <p className={`text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{item.ownerType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gameplan */}
            {session.gameplan && session.gameplan.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Gameplan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.gameplan.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className={`mt-1 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          item.done ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {item.done && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <p className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Live Session View
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{session.title}</h1>
              {isRecording && (
                <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {session.client.name}
              {session.method && ` · ${session.method.name}`}
            </p>
          </div>
          <div className="flex gap-3">
            {isRecording ? (
              <Button size="lg" variant="destructive" onClick={endSession}>
                <Square className="h-4 w-4 mr-2" />
                End Session
              </Button>
            ) : (
              <Button size="lg" onClick={startRecording}>
                <Mic className="h-5 w-5 mr-2" />
                {session.startedAt ? "Resume Recording" : "Start Recording"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left: Transcript + Chat */}
          <div className="flex flex-col gap-6 overflow-hidden">
            {/* Live Transcript */}
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Live Transcript
                    {isRecording && (
                      <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    {transcriptionStatus === "recording" && (
                      <AudioLevel stream={audioStream} isActive={isRecording} className="ml-2" />
                    )}
                  </CardTitle>
                  {!isRecording && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={audioSource === "microphone" ? "default" : "outline"}
                        onClick={() => setAudioSource("microphone")}
                        className="h-7 text-xs"
                        title="Capture microphone only"
                      >
                        <Mic className="h-3 w-3 mr-1" />
                        Mic
                      </Button>
                      <Button
                        size="sm"
                        variant={audioSource === "both" ? "default" : "outline"}
                        onClick={() => setAudioSource("both")}
                        className="h-7 text-xs"
                        title="Capture mic + system audio (for Zoom calls)"
                      >
                        <Monitor className="h-3 w-3 mr-1" />
                        Zoom
                      </Button>
                    </div>
                  )}
                </div>
                {audioSource === "both" && !isRecording && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Zoom mode will ask you to share a tab/window. Check &quot;Share audio&quot; to capture the other person.
                  </p>
                )}
              </CardHeader>
              <CardContent className="overflow-auto h-[calc(100%-4rem)]">
                {/* Audio Visualizer */}
                {isRecording && audioStream && (
                  <div className="h-16 mb-4 bg-muted/30 rounded-lg overflow-hidden">
                    <AudioVisualizer
                      stream={audioStream}
                      isActive={isRecording}
                      variant="bars"
                      barCount={48}
                    />
                  </div>
                )}

                {/* Status indicator */}
                {isRecording && transcriptionStatus !== "recording" && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {transcriptionStatus === "requesting_permissions" && "Requesting microphone access..."}
                    {transcriptionStatus === "connecting" && "Connecting to Deepgram..."}
                    {transcriptionStatus === "connected" && "Starting transcription..."}
                    {transcriptionStatus === "error" && "Connection error - check console"}
                  </div>
                )}

                {/* Transcript content */}
                {liveTranscript.length > 0 || interimTranscript ? (
                  <div className="text-sm space-y-2">
                    {liveTranscript.map((seg, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs text-muted-foreground font-medium min-w-[70px]">
                          {seg.speaker}:
                        </span>
                        <span>{seg.text}</span>
                      </div>
                    ))}
                    {interimTranscript && (
                      <div className="flex gap-2 text-muted-foreground italic">
                        <span className="text-xs font-medium min-w-[70px]">...</span>
                        <span>{interimTranscript}</span>
                      </div>
                    )}
                  </div>
                ) : session.transcript ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {session.transcript}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Volume2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>Transcript will appear here as you speak</p>
                    <p className="text-xs mt-2">
                      {audioSource === "both"
                        ? "Zoom mode: Will capture you + the other person"
                        : "Mic mode: Will capture your voice only"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Chat */}
            <Card className="h-64">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ask Your AI</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[calc(100%-3rem)]">
                <div className="flex-1 overflow-auto mb-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ask questions about this client during the call...
                    </p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm ${
                        m.role === "user"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">
                        {m.role === "user" ? "You: " : "AI: "}
                      </span>
                      {m.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask about this client..."
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: Suggestions + Commitments */}
          <div className="flex flex-col gap-6 overflow-hidden">
            {/* AI Suggestions */}
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  AI Suggestions
                  {loadingSuggestions && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto h-[calc(100%-4rem)]">
                {suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors group"
                      >
                        {suggestion.type === "commitment" ? (
                          <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-500 shrink-0" />
                        ) : (
                          <Lightbulb className="h-5 w-5 mt-0.5 text-yellow-500 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{suggestion.content}</p>
                          <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => actOnSuggestion(suggestion)}
                            >
                              {suggestion.type === "commitment" ? "Add to Actions" : "Done"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => dismissSuggestion(suggestion.id)}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mb-4 opacity-50" />
                    <p>Suggestions will appear as you talk</p>
                    <p className="text-xs mt-2">
                      Based on your gameplan and client context
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detected Commitments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Action Items ({detectedCommitments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectedCommitments.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {detectedCommitments.map((commitment, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => saveCommitmentAsAction(commitment)}
                          title="Save as action item"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <p className="text-sm flex-1">{commitment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">
                    Action items will be detected during the call
                  </p>
                )}

                {/* Manual add */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add action item..."
                    value={newCommitment}
                    onChange={(e) => setNewCommitment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addManualCommitment()}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={addManualCommitment}
                    disabled={!newCommitment.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Gameplan */}
      <div className="w-80 border-l border-border p-6 overflow-auto">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          <h2 className="font-semibold">Session Gameplan</h2>
        </div>
        {gameplan.length > 0 ? (
          <div className="space-y-3">
            {gameplan.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleGameplanItem(item.id)}
                  className="mt-1 h-4 w-4 rounded cursor-pointer"
                />
                <p
                  className={`text-sm ${
                    item.done ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No gameplan items. Add them when creating a session.
          </p>
        )}

        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2 className="font-semibold">Session Timer</h2>
          </div>
          <div className="text-3xl font-mono">{formatTime(elapsedTime)}</div>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold mb-3">Quick Context</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Client:</strong> {session.client.name}
            </p>
            {session.client.company && (
              <p>
                <strong>Company:</strong> {session.client.company}
              </p>
            )}
            {session.method && (
              <p>
                <strong>Method:</strong> {session.method.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
