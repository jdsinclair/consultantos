"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Sparkles, Info } from "lucide-react";
import Link from "next/link";

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

const templatePrompts = [
  {
    name: "Strategy Advisor",
    prompt: `You are a senior strategy advisor with expertise in:
- Business strategy and market positioning
- Go-to-market planning
- Competitive analysis
- Strategic frameworks (Porter's, SWOT, Jobs-to-be-Done, etc.)

Provide high-level strategic guidance. Think in frameworks.
Challenge assumptions. Ask probing questions.
Always tie recommendations back to business outcomes.`,
  },
  {
    name: "Sales Coach",
    prompt: `You are an experienced sales coach with expertise in:
- Solution selling and consultative sales
- Objection handling
- Sales process optimization
- Pipeline management

Focus on practical, actionable sales advice.
Help with pitch refinement, messaging, and deal strategy.
Be direct about what works and what doesn't.`,
  },
  {
    name: "Product Manager",
    prompt: `You are a seasoned product manager with expertise in:
- Product strategy and roadmapping
- User research and customer development
- Prioritization frameworks (RICE, ICE, etc.)
- Agile methodology

Help prioritize features, define requirements, and think about user needs.
Balance business goals with user experience.
Be data-informed in your recommendations.`,
  },
  {
    name: "Marketing Expert",
    prompt: `You are a marketing expert with expertise in:
- Brand positioning and messaging
- Growth marketing and demand generation
- Content strategy
- Marketing analytics

Focus on driving measurable business results.
Think about the full funnel from awareness to conversion.
Be creative but data-driven.`,
  },
];

export default function NewPersonaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    temperature: 7,
    model: "claude-3-5-sonnet",
    icon: "brain",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create persona");

      const persona = await res.json();
      router.push(`/personas/${persona.id}`);
    } catch (error) {
      console.error("Failed to create persona:", error);
      setLoading(false);
    }
  };

  const applyTemplate = (template: typeof templatePrompts[0]) => {
    setFormData({
      ...formData,
      name: template.name,
      systemPrompt: template.prompt,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/personas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Personas
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create New Persona
            </CardTitle>
            <CardDescription>
              Define an AI personality with custom behavior and expertise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Templates */}
            <div className="space-y-2">
              <Label>Quick Start Templates</Label>
              <div className="flex flex-wrap gap-2">
                {templatePrompts.map((template) => (
                  <Badge
                    key={template.name}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Persona Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Strategy Advisor"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <div className="flex gap-2 flex-wrap">
                  {icons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center transition-colors ${
                        formData.icon === icon.id
                          ? "border-primary bg-primary/10"
                          : "border-input hover:bg-accent"
                      }`}
                      onClick={() => setFormData({ ...formData, icon: icon.id })}
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
                placeholder="Short description of what this persona does"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt *</Label>
              <Textarea
                id="systemPrompt"
                placeholder="Define the persona's expertise, personality, and behavior..."
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                rows={8}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                This is the instruction that shapes the AI's responses
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <select
                  id="model"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {models.find((m) => m.id === formData.model)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {(formData.temperature / 10).toFixed(1)}
                </Label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="10"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      temperature: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={loading || !formData.name || !formData.systemPrompt}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Persona
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
