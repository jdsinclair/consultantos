"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Play,
} from "lucide-react";
import Link from "next/link";

interface Step {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions?: string[];
  outputs?: string[];
}

interface Method {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  steps: Step[] | null;
  isTemplate: boolean;
  createdAt: string;
}

const categories = [
  "strategy",
  "sales",
  "product",
  "marketing",
  "operations",
  "discovery",
  "general",
];

export default function MethodDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchMethod = async () => {
      try {
        const res = await fetch(`/api/methods/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setMethod(data);
          setSteps(data.steps || []);
        } else {
          router.push("/methods");
        }
      } catch (error) {
        console.error("Failed to fetch method:", error);
        router.push("/methods");
      } finally {
        setLoading(false);
      }
    };

    fetchMethod();
  }, [params.id, router]);

  const handleMethodChange = (field: keyof Method, value: string) => {
    if (!method) return;
    setMethod({ ...method, [field]: value });
    setHasChanges(true);
  };

  const addStep = () => {
    const newStep: Step = {
      id: String(Date.now()),
      title: "",
      description: "",
      order: steps.length + 1,
      questions: [],
      outputs: [],
    };
    setSteps([...steps, newStep]);
    setHasChanges(true);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
    setHasChanges(true);
  };

  const updateStep = (id: string, field: keyof Step, value: unknown) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!method) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/methods/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: method.name,
          description: method.description,
          category: method.category,
          steps: steps.filter((s) => s.title),
        }),
      });

      if (res.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save method:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this method?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/methods/${params.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/methods");
      }
    } catch (error) {
      console.error("Failed to delete method:", error);
      setDeleting(false);
    }
  };

  const startSessionWithMethod = () => {
    router.push(`/session/new?method=${params.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!method) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Method not found</p>
        <Link href="/methods">
          <Button className="mt-4">Back to Methods</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          href="/methods"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Methods
        </Link>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startSessionWithMethod} className="flex-1 sm:flex-none">
            <Play className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Use in Session</span>
            <span className="sm:hidden">Use</span>
          </Button>
          {!method.isTemplate && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 sm:flex-none"
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
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Method Details
                </CardTitle>
                <CardDescription>
                  Edit this consulting framework
                </CardDescription>
              </div>
              {method.isTemplate && <Badge>Template</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Method Name *</Label>
              <Input
                id="name"
                value={method.name}
                onChange={(e) => handleMethodChange("name", e.target.value)}
                disabled={method.isTemplate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={method.description || ""}
                onChange={(e) => handleMethodChange("description", e.target.value)}
                rows={2}
                disabled={method.isTemplate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={method.category || ""}
                onChange={(e) => handleMethodChange("category", e.target.value)}
                disabled={method.isTemplate}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
            {!method.isTemplate && (
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            )}
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
                        placeholder="e.g., Discovery Call"
                        value={step.title}
                        onChange={(e) => updateStep(step.id, "title", e.target.value)}
                        disabled={method.isTemplate}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What happens in this step?"
                        value={step.description || ""}
                        onChange={(e) => updateStep(step.id, "description", e.target.value)}
                        rows={2}
                        disabled={method.isTemplate}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Key Questions</Label>
                        <Textarea
                          placeholder="One question per line..."
                          value={(step.questions || []).join("\n")}
                          onChange={(e) =>
                            updateStep(
                              step.id,
                              "questions",
                              e.target.value.split("\n").filter(Boolean)
                            )
                          }
                          rows={3}
                          disabled={method.isTemplate}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Outputs</Label>
                        <Textarea
                          placeholder="One output per line..."
                          value={(step.outputs || []).join("\n")}
                          onChange={(e) =>
                            updateStep(
                              step.id,
                              "outputs",
                              e.target.value.split("\n").filter(Boolean)
                            )
                          }
                          rows={3}
                          disabled={method.isTemplate}
                        />
                      </div>
                    </div>
                  </div>

                  {!method.isTemplate && steps.length > 1 && (
                    <Button
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

          {steps.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No steps defined</p>
                {!method.isTemplate && (
                  <Button variant="outline" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Step
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {method.isTemplate && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              This is a template method and cannot be edited. You can use it as
              a starting point by creating a new method based on it.
            </p>
          </div>
        )}

        {!method.isTemplate && (
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
