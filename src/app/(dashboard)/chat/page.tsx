"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Users, BookOpen, ChevronDown } from "lucide-react";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState("Strategy Advisor");

  // Mock messages
  const messages = [
    {
      id: "1",
      role: "user",
      content: "What's the status of the Florida opportunity with Pathogen Detection?",
    },
    {
      id: "2",
      role: "assistant",
      persona: "Strategy Advisor",
      content: `Based on your recent sessions with Pathogen Detection Co, here's the current status:

**Florida State Opportunity:**
- RFP response deadline: End of month
- Key contact: Sarah (Procurement)
- You committed to sending a one-pager by Friday

**Open Items:**
1. One-pager draft needs finalization
2. AOAC certification documentation review
3. Pricing strategy for state contract

**Last discussed:** January 12, 2025 - Focus was on presentation strategy and differentiation from competitors.

Would you like me to help draft the one-pager or review the AOAC documentation?`,
    },
    {
      id: "3",
      role: "user",
      content: "Yes, help me with the one-pager. What should it include based on our discussions?",
    },
    {
      id: "4",
      role: "assistant",
      persona: "Strategy Advisor",
      content: `Based on your previous sessions, here's what the one-pager should cover:

**Recommended Structure:**

1. **Problem Statement** (1-2 sentences)
   - Florida's food safety challenges
   - Current detection time gaps

2. **Solution Overview**
   - Rapid pathogen detection technology
   - Key differentiator: Speed + accuracy

3. **State-Specific Value Props**
   - Cost savings for state labs
   - Integration with existing workflows
   - Compliance with FDA/AOAC standards

4. **Proof Points**
   - AOAC certification status
   - Pilot results (if any)
   - Customer testimonials

5. **Clear CTA**
   - Next step: Demo or pilot program

Want me to draft the content for any of these sections?`,
    },
  ];

  return (
    <div className="flex h-screen">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Chat</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                {selectedClient || "All Clients"}
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                {selectedPersona}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
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
                  {msg.role === "assistant" && msg.persona && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">{msg.persona}</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Ask anything... Use @persona to switch contexts"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" size="sm" className="text-xs">
                @strategy-advisor
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                @sales-coach
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                @content-writer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Context */}
      <div className="w-80 border-l border-border p-4 overflow-auto">
        <h2 className="font-semibold mb-4">Context</h2>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Client</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">Pathogen Detection Co</p>
            <p className="text-xs text-muted-foreground">Last session: Yesterday</p>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Relevant Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">PDF</Badge>
              Florida RFP Draft
            </div>
            <div className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Web</Badge>
              Company Website
            </div>
            <div className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Doc</Badge>
              AOAC Certification
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Active Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Sales Play Builder</p>
            <p className="text-xs text-muted-foreground">Step 2 of 4: Pain Point Mapping</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
