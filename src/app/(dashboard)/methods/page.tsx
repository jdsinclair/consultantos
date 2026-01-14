"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, ArrowRight, Loader2, Target, Sparkles } from "lucide-react";
import Link from "next/link";

// Built-in featured methods (micro-apps)
const FEATURED_METHODS = [
  {
    id: "clarity",
    name: "Clarity Method™",
    description: "Strategic Diagnosis + Execution Mapping for Founders",
    href: "/methods/clarity",
    icon: Target,
    color: "from-red-500 to-orange-500",
    badge: "Featured",
    tagline: "Chaos → Clarity → Constraint → Execution",
  },
];

interface Method {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  steps: { name: string; description?: string }[] | null;
  createdAt: string;
}

export default function MethodsPage() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch("/api/methods");
        if (res.ok) {
          const data = await res.json();
          setMethods(data);
        }
      } catch (error) {
        console.error("Failed to fetch methods:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, []);

  const categories = Array.from(new Set(methods.map((m) => m.category).filter(Boolean)));

  const filteredMethods = categoryFilter
    ? methods.filter((m) => m.category === categoryFilter)
    : methods;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Methods</h1>
          <p className="text-muted-foreground">Your consulting frameworks and playbooks</p>
        </div>
        <Link href="/methods/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Method
          </Button>
        </Link>
      </div>

      {/* Featured Methods (Built-in Micro-Apps) */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Featured Methods</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURED_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <Link key={method.id} href={method.href}>
                <Card className="hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${method.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{method.name}</CardTitle>
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {method.badge}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">{method.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">{method.tagline}</p>
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Open Method
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Your Custom Methods</span>
        </div>
      </div>

      {/* Method Categories */}
      {categories.length > 0 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={categoryFilter === null ? "secondary" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Methods Grid */}
      {filteredMethods.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredMethods.map((method) => (
            <Card key={method.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                      {method.category && (
                        <Badge variant="outline">{method.category}</Badge>
                      )}
                    </div>
                    {method.description && (
                      <CardDescription className="mt-1">{method.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Steps Preview */}
                {method.steps && method.steps.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Steps:</p>
                    <div className="flex flex-wrap gap-2">
                      {method.steps.slice(0, 4).map((step, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {i + 1}. {step.name}
                        </Badge>
                      ))}
                      {method.steps.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{method.steps.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <Link href={`/methods/${method.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      View Details
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No methods yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Create consulting frameworks to guide your sessions. Define steps, prompts, and templates.
          </p>
          <Link href="/methods/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Method
            </Button>
          </Link>
        </div>
      )}

      {/* Create New Method CTA */}
      {filteredMethods.length > 0 && (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Create a New Method</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Codify your consulting frameworks. Define steps, prompts, and templates
              that the AI can use to guide sessions.
            </p>
            <Link href="/methods/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Method
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
