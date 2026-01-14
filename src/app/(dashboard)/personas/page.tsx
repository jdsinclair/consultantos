import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Brain, Target, TrendingUp, PenTool, Code } from "lucide-react";

export default function PersonasPage() {
  const personas = [
    {
      id: "1",
      name: "Strategy Advisor",
      description: "High-level strategic thinking, frameworks, market analysis",
      icon: Target,
      model: "claude-3-5-sonnet",
      temperature: 0.7,
      active: true,
    },
    {
      id: "2",
      name: "Sales Coach",
      description: "Sales methodology, objection handling, pitch refinement",
      icon: TrendingUp,
      model: "claude-3-5-sonnet",
      temperature: 0.6,
      active: true,
    },
    {
      id: "3",
      name: "Content Writer",
      description: "Copy, messaging, email drafts, marketing content",
      icon: PenTool,
      model: "claude-3-5-sonnet",
      temperature: 0.8,
      active: true,
    },
    {
      id: "4",
      name: "Technical Advisor",
      description: "Technical architecture, code review, implementation guidance",
      icon: Code,
      model: "claude-3-5-sonnet",
      temperature: 0.4,
      active: false,
    },
    {
      id: "5",
      name: "Research Analyst",
      description: "Deep research, competitive analysis, market intelligence",
      icon: Brain,
      model: "claude-3-5-sonnet",
      temperature: 0.5,
      active: true,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personas</h1>
          <p className="text-muted-foreground">
            AI personalities you can call upon during sessions
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Persona
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            className={`transition-colors ${
              persona.active
                ? "hover:border-primary/50"
                : "opacity-60"
            }`}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <persona.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    {persona.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {persona.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  <span className="font-medium">{persona.model}</span>
                  <span className="mx-2">·</span>
                  <span>Temp: {persona.temperature}</span>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
