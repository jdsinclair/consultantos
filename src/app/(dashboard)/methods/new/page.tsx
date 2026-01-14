"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";

interface Step {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: string[];
  outputs: string[];
}

const categories = [
  "Strategy",
  "Sales",
  "Product",
  "Marketing",
  "Operations",
  "Discovery",
  "General",
];

// Method templates for quick start
const methodTemplates = [
  {
    name: "Strategy Clarity Framework",
    description: "Business clarity → Demand → Swimlanes methodology",
    category: "strategy",
    steps: [
      {
        id: "1",
        title: "Business Clarity",
        description: "Define core business model and value proposition",
        order: 1,
        questions: ["What problem are you solving?", "Who is your ideal customer?", "What makes you different?"],
        outputs: [],
      },
      {
        id: "2",
        title: "Demand Analysis",
        description: "Understand market demand and growth opportunities",
        order: 2,
        questions: ["Where does demand come from today?", "What are the growth levers?", "What's blocking growth?"],
        outputs: [],
      },
      {
        id: "3",
        title: "Swimlane Definition",
        description: "Organize initiatives into parallel workstreams",
        order: 3,
        questions: [],
        outputs: ["Swimlane diagram", "Priority matrix"],
      },
      {
        id: "4",
        title: "Execution Planning",
        description: "Define milestones and accountability",
        order: 4,
        questions: [],
        outputs: ["90-day plan", "Weekly metrics"],
      },
    ],
  },
  {
    name: "Sales Play Builder",
    description: "Create targeted sales plays and sequences",
    category: "sales",
    steps: [
      { id: "1", title: "ICP Definition", description: "Define ideal customer profile", order: 1, questions: ["What verticals?", "What company size?", "What roles?"], outputs: ["ICP document"] },
      { id: "2", title: "Pain Point Mapping", description: "Identify key pain points and triggers", order: 2, questions: ["What triggers purchase?", "What are the top 3 pains?"], outputs: ["Pain point matrix"] },
      { id: "3", title: "Messaging Framework", description: "Create value props and objection handling", order: 3, questions: [], outputs: ["Value proposition", "Objection handling guide"] },
      { id: "4", title: "Sequence Design", description: "Build outreach sequences", order: 4, questions: [], outputs: ["Email sequence", "Call scripts"] },
    ],
  },
  {
    name: "Product Discovery",
    description: "Validate product ideas with customers",
    category: "product",
    steps: [
      { id: "1", title: "Problem Definition", description: "Clearly articulate the problem space", order: 1, questions: ["What job is the customer trying to do?", "What's painful about it today?"], outputs: ["Problem statement"] },
      { id: "2", title: "Solution Hypotheses", description: "Generate potential solutions", order: 2, questions: ["What solutions might work?", "What assumptions are we making?"], outputs: ["Solution hypotheses"] },
      { id: "3", title: "Customer Interviews", description: "Validate with real customers", order: 3, questions: ["Who should we interview?", "What questions to ask?"], outputs: ["Interview guide", "Findings summary"] },
      { id: "4", title: "Prototype & Test", description: "Build and test MVP concepts", order: 4, questions: [], outputs: ["Prototype", "Test results"] },
    ],
  },
  {
    name: "90-Day Growth Plan",
    description: "Structured quarterly planning framework",
    category: "strategy",
    steps: [
      { id: "1", title: "Current State Assessment", description: "Where are we now?", order: 1, questions: ["What's working?", "What's not working?", "Key metrics?"], outputs: ["Current state doc"] },
      { id: "2", title: "Goal Setting", description: "Define 90-day objectives", order: 2, questions: ["What's the #1 goal?", "How will we measure success?"], outputs: ["OKRs"] },
      { id: "3", title: "Initiative Planning", description: "Identify key initiatives", order: 3, questions: ["What initiatives will drive the goal?", "What resources needed?"], outputs: ["Initiative roadmap"] },
      { id: "4", title: "Weekly Rhythm", description: "Establish cadence and accountability", order: 4, questions: [], outputs: ["Weekly scorecard", "Meeting cadence"] },
    ],
  },
  {
    name: "Go-to-Market Strategy",
    description: "Launch strategy for new products or markets",
    category: "marketing",
    steps: [
      { id: "1", title: "Market Analysis", description: "Understand the market landscape", order: 1, questions: ["Market size?", "Key competitors?", "Entry barriers?"], outputs: ["Market analysis doc"] },
      { id: "2", title: "Positioning", description: "Define unique positioning", order: 2, questions: ["What's our angle?", "Why us vs alternatives?"], outputs: ["Positioning statement"] },
      { id: "3", title: "Channel Strategy", description: "Determine go-to-market channels", order: 3, questions: ["How will customers find us?", "What channels to prioritize?"], outputs: ["Channel plan"] },
      { id: "4", title: "Launch Plan", description: "Execute the launch", order: 4, questions: [], outputs: ["Launch checklist", "Success metrics"] },
    ],
  },
];

export default function NewMethodPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
  });
  const [steps, setSteps] = useState<Step[]>([
    { id: "1", title: "", description: "", order: 1, questions: [], outputs: [] },
  ]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: String(Date.now()),
        title: "",
        description: "",
        order: steps.length + 1,
        questions: [],
        outputs: [],
      },
    ]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (id: string, field: keyof Step, value: unknown) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          steps: steps.filter((s) => s.title), // Only include steps with titles
        }),
      });

      if (!res.ok) throw new Error("Failed to create method");

      const method = await res.json();
      router.push(`/methods/${method.id}`);
    } catch (error) {
      console.error("Failed to create method:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/methods"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Methods
      </Link>

      {/* Template Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Start from Template
          </CardTitle>
          <CardDescription>
            Choose a template to get started quickly, or create from scratch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {methodTemplates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => {
                  setFormData({
                    name: template.name,
                    description: template.description,
                    category: template.category,
                  });
                  setSteps(template.steps);
                }}
                className="flex items-start gap-3 p-4 rounded-lg border border-input hover:border-primary hover:bg-accent/50 transition-colors text-left"
              >
                <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {template.steps.length} steps
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Method Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Method Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Strategy Clarity Framework"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this method used for?"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Steps</h2>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </div>

          {steps.map((step, index) => (
            <Card key={step.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5 cursor-grab" />
                    <span className="text-lg font-semibold">{index + 1}</span>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label>Step Title *</Label>
                      <Input
                        placeholder="e.g., Business Clarity Assessment"
                        value={step.title}
                        onChange={(e) =>
                          updateStep(step.id, "title", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What happens in this step?"
                        value={step.description}
                        onChange={(e) =>
                          updateStep(step.id, "description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Key Questions</Label>
                        <Textarea
                          placeholder="One question per line..."
                          value={step.questions.join("\n")}
                          onChange={(e) =>
                            updateStep(
                              step.id,
                              "questions",
                              e.target.value.split("\n").filter(Boolean)
                            )
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Outputs</Label>
                        <Textarea
                          placeholder="One output per line..."
                          value={step.outputs.join("\n")}
                          onChange={(e) =>
                            updateStep(
                              step.id,
                              "outputs",
                              e.target.value.split("\n").filter(Boolean)
                            )
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading || !formData.name}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Method
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
