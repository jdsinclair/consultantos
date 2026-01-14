"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Brain, Loader2 } from "lucide-react";
import Link from "next/link";

interface Persona {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  temperature: number;
  model: string;
  icon: string | null;
  isDefault: boolean;
  createdAt: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const res = await fetch("/api/personas");
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);
        }
      } catch (error) {
        console.error("Failed to fetch personas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonas();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Personas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            AI personalities you can call upon during sessions
          </p>
        </div>
        <Link href="/personas/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Create Persona
          </Button>
        </Link>
      </div>

      {personas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <Card
              key={persona.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{persona.name}</CardTitle>
                      {persona.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                    {persona.description && (
                      <CardDescription className="mt-1">
                        {persona.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-medium">{persona.model}</span>
                    <span className="mx-2">·</span>
                    <span>Temp: {(persona.temperature / 10).toFixed(1)}</span>
                  </div>
                  <Link href={`/personas/${persona.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No personas yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Create AI personalities with custom prompts and settings for different types of advice.
          </p>
          <Link href="/personas/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Persona
            </Button>
          </Link>
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-4 py-6">
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold mb-1">How Personas Work</h3>
            <p className="text-sm text-muted-foreground">
              During a live session or in chat, you can @mention a persona to switch contexts.
              Each persona has its own system prompt, temperature, and optionally its own
              training data. Great for when you need different types of advice in the same session.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Example: <code className="bg-accent px-1 rounded">@sales-coach how should I handle the pricing objection?</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
