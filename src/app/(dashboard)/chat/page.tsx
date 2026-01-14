"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Sparkles,
  Users,
  BookOpen,
  ChevronDown,
  Loader2,
  Check,
  MessageCircle,
  Zap,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  name: string;
}

export default function ChatPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showMobileContext, setShowMobileContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      clientId: selectedClient,
      personaId: selectedPersona,
    },
  });

  useEffect(() => {
    // Fetch clients and personas
    const fetchData = async () => {
      const [clientsRes, personasRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/personas"),
      ]);
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data);
      }
      if (personasRes.ok) {
        const data = await personasRes.json();
        setPersonas(data);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowClientDropdown(false);
      setShowPersonaDropdown(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const selectedClientName = clients.find((c) => c.id === selectedClient)?.name;
  const selectedPersonaName = personas.find((p) => p.id === selectedPersona)?.name;

  const toggleClientDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientDropdown(!showClientDropdown);
    setShowPersonaDropdown(false);
  };

  const togglePersonaDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPersonaDropdown(!showPersonaDropdown);
    setShowClientDropdown(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-3.5rem)]">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/20 min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-background/80 backdrop-blur-sm p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground flex-shrink-0">Chat</h1>
              <div className="flex items-center gap-2 overflow-x-auto">
                {/* Client Selector */}
                <div className="relative flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={toggleClientDropdown}
                  >
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    <span className="hidden xs:inline max-w-[80px] sm:max-w-none truncate">
                      {selectedClientName || "All Clients"}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showClientDropdown && "rotate-180")} />
                  </Button>
                  {showClientDropdown && (
                    <div
                      className="absolute top-full left-0 mt-2 w-52 bg-card border-2 border-border rounded-xl shadow-corporate-lg z-50 overflow-hidden animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={cn(
                          "px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors",
                          !selectedClient ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedClient(null);
                          setShowClientDropdown(false);
                        }}
                      >
                        All Clients
                        {!selectedClient && <Check className="h-4 w-4" />}
                      </div>
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className={cn(
                            "px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors",
                            selectedClient === client.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                          )}
                          onClick={() => {
                            setSelectedClient(client.id);
                            setShowClientDropdown(false);
                          }}
                        >
                          <span className="truncate">{client.name}</span>
                          {selectedClient === client.id && <Check className="h-4 w-4 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Persona Selector */}
                <div className="relative flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={togglePersonaDropdown}
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
                    <span className="hidden xs:inline max-w-[80px] sm:max-w-none truncate">
                      {selectedPersonaName || "Default AI"}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showPersonaDropdown && "rotate-180")} />
                  </Button>
                  {showPersonaDropdown && (
                    <div
                      className="absolute top-full left-0 mt-2 w-52 bg-card border-2 border-border rounded-xl shadow-corporate-lg z-50 overflow-hidden animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={cn(
                          "px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors",
                          !selectedPersona ? "bg-warning/10 text-warning" : "text-foreground hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedPersona(null);
                          setShowPersonaDropdown(false);
                        }}
                      >
                        Default AI
                        {!selectedPersona && <Check className="h-4 w-4" />}
                      </div>
                      {personas.map((persona) => (
                        <div
                          key={persona.id}
                          className={cn(
                            "px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors",
                            selectedPersona === persona.id ? "bg-warning/10 text-warning" : "text-foreground hover:bg-muted"
                          )}
                          onClick={() => {
                            setSelectedPersona(persona.id);
                            setShowPersonaDropdown(false);
                          }}
                        >
                          <span className="truncate">{persona.name}</span>
                          {selectedPersona === persona.id && <Check className="h-4 w-4 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile context toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-8 w-8 p-0"
              onClick={() => setShowMobileContext(!showMobileContext)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                  Start a conversation
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed px-4">
                  Ask me anything about your clients, get strategic advice, or brainstorm ideas.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[90%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground shadow-corporate"
                      : "bg-card border-2 border-border shadow-corporate"
                  )}
                >
                  {msg.role === "assistant" && selectedPersonaName && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                      <Sparkles className="h-4 w-4 text-warning" />
                      <span className="text-sm font-semibold text-foreground">{selectedPersonaName}</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-corporate">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-3 sm:p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2 sm:gap-3">
              <Input
                placeholder="Ask anything..."
                value={input}
                onChange={handleInputChange}
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="h-10 sm:h-11 px-3 sm:px-4">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {personas.length > 0 && (
              <div className="flex gap-2 mt-2 sm:mt-3 overflow-x-auto pb-1">
                {personas.slice(0, 3).map((persona) => (
                  <Button
                    key={persona.id}
                    type="button"
                    variant={selectedPersona === persona.id ? "default" : "ghost"}
                    size="sm"
                    className="text-xs gap-1.5 flex-shrink-0 h-8"
                    onClick={() => setSelectedPersona(persona.id === selectedPersona ? null : persona.id)}
                  >
                    <Zap className={cn("h-3 w-3", selectedPersona !== persona.id && "text-warning")} />
                    @{persona.name.toLowerCase().replace(/\s+/g, "-")}
                  </Button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Mobile Context Drawer */}
      {showMobileContext && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40"
            onClick={() => setShowMobileContext(false)}
          />
          <div className="lg:hidden fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-card border-l border-border p-5 overflow-auto z-50 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Context</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowMobileContext(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedClient && (
              <Card className="mb-4 border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Active Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-foreground">{selectedClientName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Context scoped to this client</p>
                </CardContent>
              </Card>
            )}

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-warning" />
                  How to Use
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  Select a client for context-aware responses
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-warning font-bold">•</span>
                  Choose a persona for different advice styles
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-success font-bold">•</span>
                  Ask about strategy, sales, content, or anything
                </p>
              </CardContent>
            </Card>

            {selectedPersona && (
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-warning" />
                    Active Persona
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-foreground">{selectedPersonaName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Custom AI personality active</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Desktop Right Sidebar - Context */}
      <div className="hidden lg:block w-80 border-l border-border bg-muted/10 p-5 overflow-auto flex-shrink-0">
        <h2 className="font-semibold text-foreground mb-4">Context</h2>

        {selectedClient && (
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-foreground">{selectedClientName}</p>
              <p className="text-xs text-muted-foreground mt-1">Context scoped to this client</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-warning" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              Select a client for context-aware responses
            </p>
            <p className="flex items-start gap-2">
              <span className="text-warning font-bold">•</span>
              Choose a persona for different advice styles
            </p>
            <p className="flex items-start gap-2">
              <span className="text-success font-bold">•</span>
              Ask about strategy, sales, content, or anything
            </p>
          </CardContent>
        </Card>

        {selectedPersona && (
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-warning" />
                Active Persona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-foreground">{selectedPersonaName}</p>
              <p className="text-xs text-muted-foreground mt-1">Custom AI personality active</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
