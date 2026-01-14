"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  FileText,
  Globe,
  FolderGit2,
  Plus,
  Send,
  Calendar,
  CheckCircle,
  MessageSquare,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  // Mock client data
  const client = {
    id: params.id,
    name: "Pathogen Detection Co",
    company: "PathogenTech Inc",
    industry: "Biotech / Life Sciences",
    status: "active",
    description: "Early-stage biotech company developing rapid pathogen detection technology for food safety and environmental monitoring.",
  };

  const sources = [
    { id: "1", type: "website", name: "Company Website", url: "https://pathogentech.com", pages: 24 },
    { id: "2", type: "document", name: "AOAC Certification Docs.pdf", size: "2.4 MB" },
    { id: "3", type: "document", name: "Florida RFP Response Draft.docx", size: "1.1 MB" },
    { id: "4", type: "document", name: "Investor Deck v3.pptx", size: "8.2 MB" },
    { id: "5", type: "repo", name: "marketing-site", url: "github.com/pathogentech/marketing" },
  ];

  const recentSessions = [
    { id: "1", title: "Florida Sales Strategy", date: "Jan 12, 2025", duration: "45 min" },
    { id: "2", title: "AOAC Process Review", date: "Jan 10, 2025", duration: "30 min" },
    { id: "3", title: "Investor Update Draft", date: "Jan 8, 2025", duration: "60 min" },
  ];

  const actionItems = [
    { id: "1", title: "Send one-pager to Florida contact", due: "Tomorrow", status: "pending" },
    { id: "2", title: "Review AOAC documentation", due: "Friday", status: "pending" },
    { id: "3", title: "Finalize investor email draft", due: "Next Monday", status: "pending" },
  ];

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "website": return Globe;
      case "repo": return FolderGit2;
      default: return FileText;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <Badge variant="success">{client.status}</Badge>
            </div>
            <p className="text-muted-foreground">{client.company} · {client.industry}</p>
            <p className="mt-2 text-sm max-w-2xl">{client.description}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/session?client=${client.id}`}>
              <Button className="gap-2">
                <Mic className="h-4 w-4" />
                Start Session
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sources */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Sources</CardTitle>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-3 w-3" />
                Add Source
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => {
                  const Icon = getSourceIcon(source.type);
                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{source.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.url || source.size || `${source.pages} pages`}
                        </p>
                      </div>
                      <Badge variant="outline">{source.type}</Badge>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 border-2 border-dashed border-border rounded-lg text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, PPTX, or paste a URL
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
              <Button size="sm" variant="outline">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/session/${session.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.date} · {session.duration}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Action Items
              </CardTitle>
              <Badge variant="secondary">{actionItems.length} pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {item.due}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Chat */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask About This Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Ask anything about this client..." />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">What was our last discussion about?</Button>
                  <Button variant="outline" size="sm">Summarize open items</Button>
                  <Button variant="outline" size="sm">Key contacts</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
