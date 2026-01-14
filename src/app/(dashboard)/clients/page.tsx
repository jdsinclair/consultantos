import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Calendar, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ClientsPage() {
  // Mock data - will come from DB
  const clients = [
    {
      id: "1",
      name: "Pathogen Detection Co",
      company: "PathogenTech Inc",
      industry: "Biotech / Life Sciences",
      status: "active",
      lastSession: "Yesterday",
      sources: 12,
      description: "Working on state sales opportunities, AOAC certification, investor updates",
    },
    {
      id: "2",
      name: "SaaS Startup",
      company: "CloudFlow",
      industry: "Software / SaaS",
      status: "active",
      lastSession: "3 days ago",
      sources: 8,
      description: "Strategy framework, swimlane planning, demand generation",
    },
    {
      id: "3",
      name: "E-commerce Brand",
      company: "StyleHouse",
      industry: "Retail / E-commerce",
      status: "active",
      lastSession: "1 week ago",
      sources: 15,
      description: "Website redesign, SEO optimization, strategic planning",
    },
    {
      id: "4",
      name: "Sales Tech",
      company: "SalesForce Pro",
      industry: "Software / Sales",
      status: "active",
      lastSession: "2 weeks ago",
      sources: 6,
      description: "CRM implementation, sales plays, sequence building",
    },
    {
      id: "5",
      name: "Product Innovator",
      company: "InnovateCo",
      industry: "Product Development",
      status: "paused",
      lastSession: "1 month ago",
      sources: 4,
      description: "Product roadmap, swimlane methodology, feature prioritization",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your consulting engagements</p>
        </div>
        <Link href="/clients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-10" />
        </div>
        <Button variant="outline">All Status</Button>
        <Button variant="outline">All Industries</Button>
      </div>

      {/* Client Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.company}</p>
                  </div>
                  <Badge variant={client.status === "active" ? "success" : "secondary"}>
                    {client.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {client.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {client.industry}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.lastSession}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {client.sources} sources
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
