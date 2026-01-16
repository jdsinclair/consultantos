"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIProfile } from "@/db/schema";

interface UserAIProfile {
  linkedin: string | null;
  otherWebsites: string[] | null;
  personalStory: string | null;
  methodology: string | null;
  notableClients: string | null;
  contentAssets: string | null;
  uniquePerspective: string | null;
  communicationStyle: string | null;
  aiContextSummary: string | null;
  aiProfile: AIProfile | null;
}

interface HelpMeAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: UserAIProfile;
  onProfileUpdate: (updates: Partial<UserAIProfile>) => void;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface FieldUpdate {
  field: keyof UserAIProfile;
  value: string | string[] | null;
  displayName: string;
}

export function HelpMeAIDialog({
  open,
  onOpenChange,
  currentProfile,
  onProfileUpdate,
}: HelpMeAIDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<FieldUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      startConversation();
    }
  }, [open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, isLoading]);

  const startConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai-profile-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          currentProfile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([{ role: "assistant", content: data.message }]);
      }
    } catch (error) {
      console.error("Failed to start AI profile builder:", error);
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm here to help you build your AI profile. Tell me a bit about yourself - what's your consulting background? What do you help people with?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-profile-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          currentProfile,
          messages: [...messages, { role: "user", content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

        if (data.updates && data.updates.length > 0) {
          setPendingUpdates(data.updates);
        }

        if (data.isComplete) {
          setIsComplete(true);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble processing that. Could you try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyUpdates = () => {
    const updates: Partial<UserAIProfile> = {};
    for (const update of pendingUpdates) {
      // @ts-ignore - we know the field is valid
      updates[update.field] = update.value;
    }
    onProfileUpdate(updates);
    setPendingUpdates([]);

    // Add confirmation message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Great! I've updated your profile with the information we discussed. You can always come back and refine it further. Is there anything else you'd like to add or change?",
      },
    ]);
  };

  const handleClose = () => {
    // Reset state when closing
    setMessages([]);
    setInput("");
    setPendingUpdates([]);
    setIsComplete(false);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Build Your AI Profile
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {/* Pending Updates Preview */}
          {pendingUpdates.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Ready to update your profile:
              </div>
              <ul className="space-y-2 text-sm">
                {pendingUpdates.map((update, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{update.displayName}:</span>{" "}
                      <span className="text-muted-foreground">
                        {typeof update.value === "string"
                          ? update.value.length > 100
                            ? update.value.slice(0, 100) + "..."
                            : update.value
                          : Array.isArray(update.value)
                          ? update.value.join(", ")
                          : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <Button onClick={applyUpdates} className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Apply These Updates
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
