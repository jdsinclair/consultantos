"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useChat } from "ai/react";

interface GameplanItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

interface Session {
  id: string;
  title: string;
  status: string;
  gameplan: GameplanItem[] | null;
  transcript: string | null;
  startedAt: string | null;
  client: {
    id: string;
    name: string;
    company: string | null;
  };
  method: {
    id: string;
    name: string;
  } | null;
}

interface Suggestion {
  id: string;
  type: string;
  content: string;
  priority: string;
}

export default function LiveSessionPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameplan, setGameplan] = useState<GameplanItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [detectedCommitments, setDetectedCommitments] = useState<string[]>([]);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {
      sessionId: params.id,
      clientContext: session?.client,
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
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "gameplan", gameplan: updated }),
    });
  };

  const endSession = async () => {
    await fetch(`/api/sessions/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    setIsRecording(false);
    // Redirect or show summary
  };

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{session.title}</h1>
              {isRecording && <Badge variant="live">LIVE</Badge>}
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
              <Button
                size="lg"
                onClick={() => setIsRecording(true)}
              >
                <Mic className="h-5 w-5 mr-2" />
                Resume Recording
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Transcript
                  {isRecording && (
                    <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto h-[calc(100%-4rem)]">
                {session.transcript ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {session.transcript}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Mic className="h-12 w-12 mb-4 opacity-50" />
                    <p>Transcript will appear here as you speak</p>
                    <p className="text-xs mt-2">
                      Real-time transcription requires Deepgram API key
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
                <div className="flex-1 overflow-auto mb-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`mb-2 text-sm ${
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
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask about this client or session..."
                    value={input}
                    onChange={handleInputChange}
                  />
                  <Button type="submit" size="icon">
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
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto h-[calc(100%-4rem)]">
                {suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                      >
                        {suggestion.type === "commitment" ? (
                          <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-500" />
                        ) : (
                          <Lightbulb className="h-5 w-5 mt-0.5 text-yellow-500" />
                        )}
                        <p className="text-sm">{suggestion.content}</p>
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
                  Detected Commitments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectedCommitments.length > 0 ? (
                  <div className="space-y-3">
                    {detectedCommitments.map((commitment, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 h-4 w-4 rounded" />
                        <p className="text-sm">{commitment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Action items will be detected automatically during the call
                  </p>
                )}
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
        <div className="space-y-3">
          {gameplan.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleGameplanItem(item.id)}
                className="mt-1 h-4 w-4 rounded"
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
