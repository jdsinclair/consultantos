"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Shield,
  Skull,
  Compass,
  RefreshCw,
  UserCheck,
  Globe,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ProspectEvaluation {
  summary: string;
  whyWeLoveIt: string[];
  whyWeHateIt: string[];
  potentialBiases: string[];
  keyInsights: string[];
  marketPosition: string;
  competitiveAdvantage: string;
  biggestRisks: string[];
  recommendedApproach: string;
  fitScore: number;
  evaluatedAt: string;
}

interface Prospect {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  status: string;
  sourceType: string | null;
  sourceNotes: string | null;
  evaluation: ProspectEvaluation | null;
  evaluatedAt: string | null;
  createdAt: string;
}

export default function ProspectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchProspect();
  }, [params.id]);

  const fetchProspect = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setProspect(data);
      } else {
        router.push("/prospects");
      }
    } catch (error) {
      console.error("Failed to fetch prospect:", error);
      router.push("/prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!prospect) return;
    setEvaluating(true);

    try {
      // Crawl website if available
      let websiteContent = "";
      if (prospect.website) {
        try {
          const crawlRes = await fetch("/api/crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: prospect.website }),
          });
          if (crawlRes.ok) {
            const data = await crawlRes.json();
            websiteContent = data.content || "";
          }
        } catch {
          // Continue without website content
        }
      }

      const res = await fetch("/api/prospects/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: prospect.id,
          websiteContent,
          additionalContext: prospect.description,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProspect(updated);
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setEvaluating(false);
    }
  };

  const handleConvert = async () => {
    if (!prospect) return;
    setConverting(true);

    try {
      const res = await fetch(`/api/clients/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (res.ok) {
        router.push(`/clients/${prospect.id}`);
      }
    } catch (error) {
      console.error("Conversion failed:", error);
      setConverting(false);
    }
  };

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

  if (!prospect) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Prospect not found</p>
      </div>
    );
  }

  const eval_ = prospect.evaluation;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prospects
        </Link>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEvaluate}
            disabled={evaluating}
          >
            {evaluating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {eval_ ? "Re-evaluate" : "Evaluate"}
          </Button>

          <Button onClick={handleConvert} disabled={converting} className="gap-2">
            {converting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Convert to Client
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{prospect.name}</CardTitle>
                <Badge variant="secondary">Prospect</Badge>
              </div>
              {prospect.company && (
                <CardDescription className="text-lg mt-1">
                  {prospect.company}
                </CardDescription>
              )}
            </div>
            {eval_ && (
              <div className={`text-4xl font-bold ${getFitScoreColor(eval_.fitScore)}`}>
                <div className="flex items-center gap-2">
                  <Star className="h-8 w-8 fill-current" />
                  {eval_.fitScore}/10
                </div>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Fit Score
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {prospect.website && (
              <a
                href={prospect.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary"
              >
                <Globe className="h-4 w-4" />
                {prospect.website}
              </a>
            )}
            {prospect.industry && (
              <span>Industry: {prospect.industry}</span>
            )}
            {prospect.sourceType && (
              <span>Source: {prospect.sourceType}</span>
            )}
            <span>
              Added {formatDistanceToNow(new Date(prospect.createdAt), { addSuffix: true })}
            </span>
          </div>

          {prospect.description && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{prospect.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluation */}
      {eval_ ? (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{eval_.summary}</p>
              <p className="text-xs text-muted-foreground mt-3">
                Evaluated {formatDistanceToNow(new Date(eval_.evaluatedAt), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Why We Love It */}
            <Card className="border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-500">
                  <ThumbsUp className="h-5 w-5" />
                  Why We Love It
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {eval_.whyWeLoveIt.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-green-500">+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Why We Hate It */}
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <ThumbsDown className="h-5 w-5" />
                  Why We Hate It
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {eval_.whyWeHateIt.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-red-500">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Lightbulb className="h-5 w-5" />
                Key Insights
              </CardTitle>
              <CardDescription>
                Observations that show we understand their business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {eval_.keyInsights.map((insight, i) => (
                  <li
                    key={i}
                    className="flex gap-3 p-3 bg-primary/5 rounded-lg text-sm"
                  >
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Market Position */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Market Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{eval_.marketPosition}</p>
              </CardContent>
            </Card>

            {/* Competitive Advantage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Competitive Advantage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{eval_.competitiveAdvantage}</p>
              </CardContent>
            </Card>
          </div>

          {/* Potential Biases */}
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                Watch Your Biases
              </CardTitle>
              <CardDescription>
                Cognitive biases that might affect your judgment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {eval_.potentialBiases.map((bias, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    {bias}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Biggest Risks */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Skull className="h-5 w-5" />
                Biggest Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {eval_.biggestRisks.map((risk, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-destructive font-bold">{i + 1}.</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommended Approach */}
          <Card className="bg-primary/5 border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5" />
                Recommended Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{eval_.recommendedApproach}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Evaluation Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Run an AI evaluation to get insights before your first conversation.
              Works best with a website URL or some context about the prospect.
            </p>
            <Button onClick={handleEvaluate} disabled={evaluating}>
              {evaluating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run Evaluation
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
