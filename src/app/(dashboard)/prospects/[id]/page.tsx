"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/use-file-upload";
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
  Edit,
  MessageSquare,
  Zap,
  Upload,
  FileText,
  ExternalLink,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  XCircle,
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

interface Source {
  id: string;
  name: string;
  type: string;
  fileType: string | null;
  blobUrl: string | null;
  processingStatus: string;
  createdAt: string;
}

interface QuickSummary {
  verdict: "strong_pass" | "worth_exploring" | "proceed_with_caution" | "hard_pass";
  oneLiner: string;
  keyStrength: string;
  keyRisk: string;
  tarpitScore: number;
  biasWarning: string;
  nextQuestion: string;
}

export default function ProspectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showQuickSummary, setShowQuickSummary] = useState(false);
  const [quickSummary, setQuickSummary] = useState<QuickSummary | null>(null);
  const [loadingQuickSummary, setLoadingQuickSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, uploading, progress } = useFileUpload({
    clientId: params.id,
    onSuccess: (result) => {
      setSources((prev) => [result.source as Source, ...prev]);
    },
    onError: (error) => {
      console.error("Upload failed:", error);
    },
  });

  useEffect(() => {
    fetchProspect();
    fetchSources();
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

  const fetchSources = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}/sources`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile(file);
    } catch (error) {
      // Error already handled by hook
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  const handleQuickSummary = async () => {
    setShowQuickSummary(true);
    if (quickSummary) return; // Already loaded

    setLoadingQuickSummary(true);
    try {
      const res = await fetch(`/api/prospects/${params.id}/quick-summary`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setQuickSummary(data);
      }
    } catch (error) {
      console.error("Quick summary failed:", error);
    } finally {
      setLoadingQuickSummary(false);
    }
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getVerdictConfig = (verdict: QuickSummary["verdict"]) => {
    switch (verdict) {
      case "strong_pass":
        return { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Strong Pass" };
      case "worth_exploring":
        return { icon: HelpCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Worth Exploring" };
      case "proceed_with_caution":
        return { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Proceed with Caution" };
      case "hard_pass":
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Hard Pass" };
    }
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Quick Summary Modal */}
      {showQuickSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Analysis
                </CardTitle>
                <CardDescription>Aggressive, no-nonsense assessment</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickSummary(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingQuickSummary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : quickSummary ? (
                <div className="space-y-4">
                  {/* Verdict */}
                  {(() => {
                    const config = getVerdictConfig(quickSummary.verdict);
                    const Icon = config.icon;
                    return (
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                        <div>
                          <p className={`font-bold ${config.color}`}>{config.label}</p>
                          <p className="text-sm text-muted-foreground">{quickSummary.oneLiner}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tarpit Score */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Tarpit Risk</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            quickSummary.tarpitScore <= 3
                              ? "bg-green-500"
                              : quickSummary.tarpitScore <= 6
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${quickSummary.tarpitScore * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{quickSummary.tarpitScore}/10</span>
                    </div>
                  </div>

                  {/* Key Strength */}
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Key Strength</span>
                    </div>
                    <p className="text-sm">{quickSummary.keyStrength}</p>
                  </div>

                  {/* Key Risk */}
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Key Risk</span>
                    </div>
                    <p className="text-sm">{quickSummary.keyRisk}</p>
                  </div>

                  {/* Bias Warning */}
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-600">Watch Your Bias</span>
                    </div>
                    <p className="text-sm">{quickSummary.biasWarning}</p>
                  </div>

                  {/* Next Question */}
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Ask This</span>
                    </div>
                    <p className="text-sm font-medium">{quickSummary.nextQuestion}</p>
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      setShowQuickSummary(false);
                      router.push(`/prospects/${params.id}/eval`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Deep Evaluation
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Failed to load summary
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          href="/prospects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prospects
        </Link>

        <div className="flex flex-wrap gap-2">
          {/* Quick Summary Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickSummary}
            className="gap-2"
          >
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Analysis
          </Button>

          <Link href={`/prospects/${params.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>

          <Link href={`/prospects/${params.id}/eval`}>
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Eval Chat
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
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

          <Button onClick={handleConvert} disabled={converting} className="gap-2" size="sm">
            {converting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Convert to Client</span>
            <span className="sm:hidden">Convert</span>
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl">{prospect.name}</CardTitle>
                <Badge variant="secondary">Prospect</Badge>
              </div>
              {prospect.company && (
                <CardDescription className="text-base sm:text-lg mt-1">
                  {prospect.company}
                </CardDescription>
              )}
            </div>
            {eval_ && (
              <div className={`text-3xl sm:text-4xl font-bold ${getFitScoreColor(eval_.fitScore)} flex-shrink-0`}>
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 sm:h-8 sm:w-8 fill-current" />
                  {eval_.fitScore}/10
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-1">
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

      {/* Documents/Sources Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Documents ({sources.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
            />
          </div>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                Upload a document
              </Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="group flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {source.processingStatus === "processing" ? (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Processing
                          </Badge>
                        ) : source.processingStatus === "completed" ? (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {source.blobUrl && (
                      <a
                        href={source.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-background rounded"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
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

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
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

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
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
            <div className="flex gap-3">
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
              <Link href={`/prospects/${params.id}/eval`}>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Eval Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
