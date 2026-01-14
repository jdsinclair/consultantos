"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface GameplanItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface Method {
  id: string;
  name: string;
  steps: Array<{ id: string; title: string; questions?: string[] }> | null;
}

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    clientId: preselectedClientId || "",
    methodId: "",
  });
  const [gameplan, setGameplan] = useState<GameplanItem[]>([
    { id: "1", text: "", done: false, order: 1 },
  ]);

  useEffect(() => {
    // Fetch clients and methods
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/methods").then((r) => r.json()),
    ]).then(([clientsData, methodsData]) => {
      setClients(clientsData);
      setMethods(methodsData);
    });
  }, []);

  const handleMethodChange = (methodId: string) => {
    setFormData({ ...formData, methodId });

    // Auto-populate gameplan from method steps
    if (methodId) {
      const method = methods.find((m) => m.id === methodId);
      if (method?.steps) {
        const items: GameplanItem[] = method.steps.map((step, i) => ({
          id: String(i + 1),
          text: step.title,
          done: false,
          order: i + 1,
        }));
        setGameplan(items.length > 0 ? items : gameplan);
      }
    }
  };

  const addGameplanItem = () => {
    setGameplan([
      ...gameplan,
      {
        id: String(Date.now()),
        text: "",
        done: false,
        order: gameplan.length + 1,
      },
    ]);
  };

  const removeGameplanItem = (id: string) => {
    if (gameplan.length <= 1) return;
    setGameplan(
      gameplan.filter((g) => g.id !== id).map((g, i) => ({ ...g, order: i + 1 }))
    );
  };

  const updateGameplanItem = (id: string, text: string) => {
    setGameplan(gameplan.map((g) => (g.id === id ? { ...g, text } : g)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          gameplan: gameplan.filter((g) => g.text),
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const session = await res.json();

      // Start session immediately
      await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/session"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Start New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
                required
              >
                <option value="">Select client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Q1 Strategy Review"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Method (Optional)</Label>
              <select
                id="method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.methodId}
                onChange={(e) => handleMethodChange(e.target.value)}
              >
                <option value="">No specific method</option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Selecting a method will auto-populate the gameplan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gameplan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Session Gameplan</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addGameplanItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              What do you want to cover in this session? The AI will help keep
              you on track.
            </p>
            {gameplan.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6">
                  {index + 1}.
                </span>
                <Input
                  placeholder="Agenda item..."
                  value={item.text}
                  onChange={(e) => updateGameplanItem(item.id, e.target.value)}
                  className="flex-1"
                />
                {gameplan.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGameplanItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={loading || !formData.clientId || !formData.title}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Session Now
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
