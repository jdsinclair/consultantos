"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Sparkles, Info, Trash2, Save } from "lucide-react";
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

const icons = [
  { id: "brain", label: "Brain" },
  { id: "target", label: "Target" },
  { id: "trending-up", label: "Growth" },
  { id: "pen-tool", label: "Creative" },
  { id: "lightbulb", label: "Ideas" },
  { id: "shield", label: "Shield" },
  { id: "zap", label: "Energy" },
  { id: "heart", label: "Heart" },
];

const models = [
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", description: "Best balance of speed and capability" },
  { id: "claude-3-opus", name: "Claude 3 Opus", description: "Most capable, best for complex tasks" },
  { id: "gpt-4o", name: "GPT-4o", description: "OpenAI's multimodal model" },
];

export default function PersonaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchPersona = async () => {
      try {
        const res = await fetch(`/api/personas/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPersona(data);
        } else {
          router.push("/personas");
        }
      } catch (error) {
        console.error("Failed to fetch persona:", error);
        router.push("/personas");
      } finally {
        setLoading(false);
      }
    };

    fetchPersona();
  }, [params.id, router]);

  const handleChange = (field: keyof Persona, value: string | number) => {
    if (!persona) return;
    setPersona({ ...persona, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!persona) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/personas/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: persona.name,
          description: persona.description,
          systemPrompt: persona.systemPrompt,
          temperature: persona.temperature,
          model: persona.model,
          icon: persona.icon,
        }),
      });

      if (res.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save persona:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this persona?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/personas/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/personas");
      }
    } catch (error) {
      console.error("Failed to delete persona:", error);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Persona not found</p>
        <Link href="/personas">
          <Button className="mt-4">Back to Personas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/personas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Personas
        </Link>

        {!persona.isDefault && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </>
            )}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Edit Persona
              </CardTitle>
              <CardDescription>
                Customize this persona's behavior and expertise
              </CardDescription>
            </div>
            {persona.isDefault && (
              <Badge>Default Persona</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Persona Name *</Label>
              <Input
                id="name"
                value={persona.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={persona.isDefault}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <div className="flex gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
                      persona.icon === icon.id
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-accent"
                    }`}
                    onClick={() => handleChange("icon", icon.id)}
                    disabled={persona.isDefault}
                    title={icon.label}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={persona.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Short description of what this persona does"
              disabled={persona.isDefault}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt *</Label>
            <Textarea
              id="systemPrompt"
              value={persona.systemPrompt}
              onChange={(e) => handleChange("systemPrompt", e.target.value)}
              rows={10}
              className="font-mono text-sm"
              disabled={persona.isDefault}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              This instruction shapes the AI's responses when using this persona
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <select
                id="model"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={persona.model}
                onChange={(e) => handleChange("model", e.target.value)}
                disabled={persona.isDefault}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {models.find((m) => m.id === persona.model)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {(persona.temperature / 10).toFixed(1)}
              </Label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="10"
                value={persona.temperature}
                onChange={(e) =>
                  handleChange("temperature", parseInt(e.target.value))
                }
                className="w-full"
                disabled={persona.isDefault}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>
          </div>

          {persona.isDefault && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>
                This is a default persona and cannot be edited. You can create a
                copy by creating a new persona and using this one as a template.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!persona.isDefault && (
        <div className="flex gap-4 mt-6">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
