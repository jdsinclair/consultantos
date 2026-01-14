import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, ArrowRight, Target, Users, TrendingUp, Layers } from "lucide-react";
import Link from "next/link";

export default function MethodsPage() {
  // Your consulting frameworks
  const methods = [
    {
      id: "1",
      name: "Strategy Clarity Framework",
      category: "Strategy",
      description: "Business clarity → Demand → Swimlanes methodology for strategic planning",
      steps: ["Business Clarity Assessment", "Demand Analysis", "Swimlane Definition", "Prioritization"],
      icon: Target,
      usageCount: 12,
    },
    {
      id: "2",
      name: "Sales Play Builder",
      category: "Sales",
      description: "Framework for creating targeted sales plays and sequences",
      steps: ["ICP Definition", "Pain Point Mapping", "Messaging Framework", "Sequence Design"],
      icon: TrendingUp,
      usageCount: 8,
    },
    {
      id: "3",
      name: "Product Roadmap Designer",
      category: "Product",
      description: "Swimlane-based product roadmap with reasoning and prioritization",
      steps: ["Vision Alignment", "Feature Inventory", "Swimlane Organization", "Timeline Mapping"],
      icon: Layers,
      usageCount: 5,
    },
    {
      id: "4",
      name: "Stakeholder Alignment",
      category: "General",
      description: "Process for aligning multiple stakeholders on complex decisions",
      steps: ["Stakeholder Mapping", "Interest Analysis", "Alignment Sessions", "Decision Framework"],
      icon: Users,
      usageCount: 15,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Methods</h1>
          <p className="text-muted-foreground">Your consulting frameworks and playbooks</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Method
        </Button>
      </div>

      {/* Method Categories */}
      <div className="mb-6 flex gap-2">
        <Button variant="secondary" size="sm">All</Button>
        <Button variant="outline" size="sm">Strategy</Button>
        <Button variant="outline" size="sm">Sales</Button>
        <Button variant="outline" size="sm">Product</Button>
        <Button variant="outline" size="sm">General</Button>
      </div>

      {/* Methods Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {methods.map((method) => (
          <Card key={method.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <method.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                    <Badge variant="outline">{method.category}</Badge>
                  </div>
                  <CardDescription className="mt-1">{method.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Steps Preview */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Steps:</p>
                <div className="flex flex-wrap gap-2">
                  {method.steps.map((step, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {i + 1}. {step}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Used {method.usageCount} times
                </p>
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

      {/* Create New Method CTA */}
      <Card className="mt-6 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Create a New Method</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Codify your consulting frameworks. Define steps, prompts, and templates
            that the AI can use to guide sessions.
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Method
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
