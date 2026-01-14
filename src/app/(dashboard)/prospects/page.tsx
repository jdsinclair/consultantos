"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Loader2,
  ArrowRight,
  Star,
  AlertTriangle,
  Globe,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Prospect {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  evaluation: {
    summary: string;
    fitScore: number;
  } | null;
  evaluatedAt: string | null;
  createdAt: string;
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const res = await fetch("/api/clients?status=prospect");
      if (res.ok) {
        const data = await res.json();
        setProspects(data);
      }
    } catch (error) {
      console.error("Failed to fetch prospects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProspects = prospects.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.company?.toLowerCase().includes(query) ||
      p.website?.toLowerCase().includes(query)
    );
  });

  const getFitScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

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
          <h1 className="text-3xl font-bold">Prospects</h1>
          <p className="text-muted-foreground">
            Evaluate potential clients before they become engagements
          </p>
        </div>
        <Link href="/prospects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Prospect
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search prospects..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Prospects Grid */}
      {filteredProspects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProspects.map((prospect) => (
            <Card
              key={prospect.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{prospect.name}</CardTitle>
                    {prospect.company && (
                      <CardDescription>{prospect.company}</CardDescription>
                    )}
                  </div>
                  {prospect.evaluation && (
                    <div className={`flex items-center gap-1 font-bold ${getFitScoreColor(prospect.evaluation.fitScore)}`}>
                      <Star className="h-4 w-4 fill-current" />
                      {prospect.evaluation.fitScore}/10
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {prospect.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{prospect.website}</span>
                  </div>
                )}

                {prospect.evaluation ? (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {prospect.evaluation.summary}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-500 mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    Not evaluated yet
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Added {formatDistanceToNow(new Date(prospect.createdAt), { addSuffix: true })}
                  </span>
                  <Link href={`/prospects/${prospect.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      View
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
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No prospects yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Add a prospect with just a URL or basic info. The AI will analyze
            them and give you a framework for the conversation.
          </p>
          <Link href="/prospects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Prospect
            </Button>
          </Link>
        </div>
      )}

      {/* How It Works */}
      {filteredProspects.length > 0 && (
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="flex items-start gap-4 py-6">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold mb-1">AI-Powered Evaluation</h3>
              <p className="text-sm text-muted-foreground">
                Each prospect is analyzed to give you insights before the first call:
                what&apos;s compelling, what&apos;s risky, potential biases in your thinking,
                and a recommended approach. Convert to a client when you&apos;re ready to engage.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
