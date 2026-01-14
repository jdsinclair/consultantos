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
} from "lucide-react";

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
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border bg-background/80 backdrop-blur-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Chat</h1>
            <div className="flex items-center gap-2">
              {/* Client Selector */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={toggleClientDropdown}
                >
                  <Users className="h-4 w-4 text-primary" />
                  {selectedClientName || "All Clients"}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showClientDropdown ? "rotate-180" : ""}`} />
                </Button>
                {showClientDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 w-52 bg-card border-2 border-border rounded-xl shadow-corporate-lg z-50 overflow-hidden animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={`px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors ${
                        !selectedClient
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
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
                        className={`px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors ${
                          selectedClient === client.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedClient(client.id);
                          setShowClientDropdown(false);
                        }}
                      >
                        {client.name}
                        {selectedClient === client.id && <Check className="h-4 w-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Persona Selector */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={togglePersonaDropdown}
                >
                  <Sparkles className="h-4 w-4 text-warning" />
                  {selectedPersonaName || "Default AI"}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPersonaDropdown ? "rotate-180" : ""}`} />
                </Button>
                {showPersonaDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 w-52 bg-card border-2 border-border rounded-xl shadow-corporate-lg z-50 overflow-hidden animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={`px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors ${
                        !selectedPersona
                          ? "bg-warning/10 text-warning"
                          : "text-foreground hover:bg-muted"
                      }`}
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
                        className={`px-4 py-2.5 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors ${
                          selectedPersona === persona.id
                            ? "bg-warning/10 text-warning"
                            : "text-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedPersona(persona.id);
                          setShowPersonaDropdown(false);
                        }}
                      >
                        {persona.name}
                        {selectedPersona === persona.id && <Check className="h-4 w-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Start a conversation
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Ask me anything about your clients, get strategic advice, or brainstorm ideas.
                  Select a client for context-aware responses.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground shadow-corporate"
                      : "bg-card border-2 border-border shadow-corporate"
                  }`}
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
                <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-corporate">
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
        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Input
                placeholder="Ask anything about your clients..."
                value={input}
                onChange={handleInputChange}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="px-4">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {personas.length > 0 && (
              <div className="flex gap-2 mt-3">
                {personas.slice(0, 3).map((persona) => (
                  <Button
                    key={persona.id}
                    type="button"
                    variant={selectedPersona === persona.id ? "default" : "ghost"}
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => setSelectedPersona(persona.id === selectedPersona ? null : persona.id)}
                  >
                    <Zap className={`h-3 w-3 ${selectedPersona === persona.id ? "" : "text-warning"}`} />
                    @{persona.name.toLowerCase().replace(/\s+/g, "-")}
                  </Button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Sidebar - Context */}
      <div className="w-80 border-l border-border bg-muted/10 p-5 overflow-auto hidden lg:block">
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
