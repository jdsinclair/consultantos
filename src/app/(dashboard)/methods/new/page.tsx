"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Method</CardTitle>
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
