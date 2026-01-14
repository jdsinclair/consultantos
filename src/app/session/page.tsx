"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function LiveSession() {
  const [isLive, setIsLive] = useState(false);
  const [message, setMessage] = useState("");

  // Mock data
  const gameplan = [
    { id: "1", text: "Discuss Florida state opportunity timeline", done: true },
    { id: "2", text: "Review AOAC certification status", done: true },
    { id: "3", text: "Align on one-pager design approach", done: false },
    { id: "4", text: "Set next steps for investor update", done: false },
  ];

  const suggestions = [
    {
      id: "1",
      type: "talking_point",
      text: "Ask about their timeline for the state RFP response",
      icon: Lightbulb,
    },
    {
      id: "2",
      type: "commitment",
      text: "You committed to send the one-pager by Friday",
      icon: AlertTriangle,
    },
    {
      id: "3",
      type: "insight",
      text: "They mentioned budget constraints - might want to discuss phased approach",
      icon: MessageSquare,
    },
  ];

  const detectedActions = [
    { id: "1", text: "Send one-pager draft by Friday", owner: "You", timestamp: "14:23" },
    { id: "2", text: "Schedule follow-up with procurement team", owner: "Client", timestamp: "14:31" },
  ];

  const transcript = [
    { speaker: "Client", text: "So the Florida opportunity is really exciting for us...", time: "14:20" },
    { speaker: "You", text: "Absolutely, I've been looking at similar state contracts and...", time: "14:21" },
    { speaker: "Client", text: "The timeline is tight though, they want responses by end of month...", time: "14:22" },
  ];

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Live Session</h1>
              {isLive && <Badge variant="live">LIVE</Badge>}
            </div>
            <p className="text-muted-foreground">Pathogen Detection Co - Florida Sales Prep</p>
          </div>
          <Button
            size="lg"
            variant={isLive ? "destructive" : "default"}
            onClick={() => setIsLive(!isLive)}
            className="gap-2"
          >
            {isLive ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isLive ? "End Session" : "Start Recording"}
          </Button>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left: Transcript + Chat */}
          <div className="flex flex-col gap-6 overflow-hidden">
            {/* Transcript */}
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Transcript
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto h-[calc(100%-4rem)]">
                <div className="space-y-4">
                  {transcript.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <Badge variant={entry.speaker === "You" ? "default" : "secondary"} className="h-6">
                        {entry.speaker}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{entry.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                  {isLive && (
                    <div className="flex gap-3">
                      <Badge variant="secondary" className="h-6">Client</Badge>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground italic">Listening...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Chat */}
            <Card className="h-48">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ask Your AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question about this client or session..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Try: "What did we discuss about pricing last time?" or "Summarize their AOAC status"
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Suggestions + Actions */}
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
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <suggestion.icon className="h-5 w-5 mt-0.5 text-yellow-500" />
                      <p className="text-sm">{suggestion.text}</p>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-3">
                  {detectedActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.owner} · {action.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
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
        <div className="space-y-3">
          {gameplan.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.done}
                className="mt-1 h-4 w-4 rounded"
                readOnly
              />
              <p className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
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
          <div className="text-3xl font-mono">
            {isLive ? "00:14:32" : "00:00:00"}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold mb-3">Quick Context</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Last session:</strong> Jan 10, 2025</p>
            <p><strong>Main focus:</strong> State sales opportunities</p>
            <p><strong>Open items:</strong> 3 pending actions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
