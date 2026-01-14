"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Users, BookOpen, ChevronDown, Loader2 } from "lucide-react";

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

  const selectedClientName = clients.find((c) => c.id === selectedClient)?.name;
  const selectedPersonaName = personas.find((p) => p.id === selectedPersona)?.name;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Chat</h1>
            <div className="flex items-center gap-2 relative">
              {/* Client Selector */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                >
                  <Users className="h-4 w-4" />
                  {selectedClientName || "All Clients"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {showClientDropdown && (
                  <div className="absolute top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10">
                    <div
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedClient(null);
                        setShowClientDropdown(false);
                      }}
                    >
                      All Clients
                    </div>
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedClient(client.id);
                          setShowClientDropdown(false);
                        }}
                      >
                        {client.name}
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
                  onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                >
                  <Sparkles className="h-4 w-4" />
                  {selectedPersonaName || "Default AI"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {showPersonaDropdown && (
                  <div className="absolute top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10">
                    <div
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedPersona(null);
                        setShowPersonaDropdown(false);
                      }}
                    >
                      Default AI
                    </div>
                    {personas.map((persona) => (
                      <div
                        key={persona.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedPersona(persona.id);
                          setShowPersonaDropdown(false);
                        }}
                      >
                        {persona.name}
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
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
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
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent"
                  }`}
                >
                  {msg.role === "assistant" && selectedPersonaName && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedPersonaName}</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-accent rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Ask anything about your clients..."
                value={input}
                onChange={handleInputChange}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {personas.length > 0 && (
              <div className="flex gap-2 mt-2">
                {personas.slice(0, 3).map((persona) => (
                  <Button
                    key={persona.id}
                    type="button"
                    variant={selectedPersona === persona.id ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedPersona(persona.id)}
                  >
                    @{persona.name.toLowerCase().replace(/\s+/g, "-")}
                  </Button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Sidebar - Context */}
      <div className="w-80 border-l border-border p-4 overflow-auto hidden lg:block">
        <h2 className="font-semibold mb-4">Context</h2>

        {selectedClient && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{selectedClientName}</p>
              <p className="text-xs text-muted-foreground">Context scoped to this client</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Select a client for context-aware responses</p>
            <p>• Choose a persona for different advice styles</p>
            <p>• Ask about strategy, sales, content, or anything</p>
          </CardContent>
        </Card>

        {selectedPersona && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Active Persona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{selectedPersonaName}</p>
              <p className="text-xs text-muted-foreground">Custom AI personality active</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
