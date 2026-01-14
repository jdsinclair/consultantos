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
  Save,
  Plus,
  Lock,
  Unlock,
  FileText,
  Sparkles,
  Target,
  Users,
  Zap,
  Heart,
  Skull,
  MessageSquare,
  Bell,
  Check,
  X,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  LockIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ClaritySection {
  id: string;
  title: string;
  content: string;
  lockedAt: string;
  source?: string;
}

interface ClarityFieldMeta {
  status: "draft" | "confirmed" | "locked";
  source?: string;
  sourceContext?: string;
  confirmedAt?: string;
  lockedAt?: string;
}

interface ClarityInsight {
  id: string;
  clientId: string;
  fieldName: string;
  customFieldTitle?: string;
  suggestedValue: string;
  action: string;
  reasoning?: string;
  confidence?: number;
  sourceType: string;
  sourceId?: string;
  sourceContext?: string;
  status: string;
  createdAt: string;
}

interface ClarityDocument {
  id: string;
  clientId: string;
  niche: string | null;
  desiredOutcome: string | null;
  offer: string | null;
  positioningStatement: string | null;
  whoWeAre: string | null;
  whatWeDo: string | null;
  howWeDoIt: string | null;
  ourWedge: string | null;
  whyPeopleLoveUs: string | null;
  howWeWillDie: string | null;
  sections: ClaritySection[] | null;
  fieldMeta: Record<string, ClarityFieldMeta> | null;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
}

// Field Status Control Component
function FieldStatusControl({
  fieldName,
  status,
  hasContent,
  onChange,
}: {
  fieldName: string;
  status?: "draft" | "confirmed" | "locked";
  hasContent: boolean;
  onChange: (fieldName: string, status: "draft" | "confirmed" | "locked") => void;
}) {
  if (!hasContent) return null;

  const currentStatus = status || "draft";

  const handleClick = () => {
    // Cycle through statuses: draft -> confirmed -> locked -> draft
    const nextStatus: Record<string, "draft" | "confirmed" | "locked"> = {
      draft: "confirmed",
      confirmed: "locked",
      locked: "draft",
    };
    onChange(fieldName, nextStatus[currentStatus]);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="h-7 gap-1 text-xs"
      title={`Click to ${currentStatus === "draft" ? "confirm" : currentStatus === "confirmed" ? "lock" : "unlock"}`}
    >
      {currentStatus === "draft" && (
        <>
          <AlertCircle className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Draft</span>
        </>
      )}
      {currentStatus === "confirmed" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-green-600">Confirmed</span>
        </>
      )}
      {currentStatus === "locked" && (
        <>
          <LockIcon className="h-3 w-3 text-primary" />
          <span className="text-primary">Locked</span>
        </>
      )}
    </Button>
  );
}

export default function ClarityDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [doc, setDoc] = useState<ClarityDocument | null>(null);
  const [insights, setInsights] = useState<ClarityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", content: "" });
  const [showAddSection, setShowAddSection] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [processingInsight, setProcessingInsight] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [clientRes, clarityRes, insightsRes] = await Promise.all([
        fetch(`/api/clients/${params.id}`),
        fetch(`/api/clients/${params.id}/clarity`),
        fetch(`/api/clients/${params.id}/clarity/insights`),
      ]);

      if (clientRes.ok) setClient(await clientRes.json());
      if (clarityRes.ok) setDoc(await clarityRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ClarityDocument, value: string) => {
    if (!doc) return;
    setDoc({ ...doc, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!doc) return;
    setSaving(true);

    try {
      await fetch(`/api/clients/${params.id}/clarity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: doc.niche,
          desiredOutcome: doc.desiredOutcome,
          offer: doc.offer,
          whoWeAre: doc.whoWeAre,
          whatWeDo: doc.whatWeDo,
          howWeDoIt: doc.howWeDoIt,
          ourWedge: doc.ourWedge,
          whyPeopleLoveUs: doc.whyPeopleLoveUs,
          howWeWillDie: doc.howWeWillDie,
        }),
      });
      setHasChanges(false);
      // Refresh to get updated positioning statement
      fetchData();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSection.title || !newSection.content) return;

    try {
      const res = await fetch(`/api/clients/${params.id}/clarity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSection.title,
          content: newSection.content,
          source: "manual",
        }),
      });

      if (res.ok) {
        setNewSection({ title: "", content: "" });
        setShowAddSection(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add section:", error);
    }
  };

  const handleInsightAction = async (insightId: string, action: "accept" | "reject" | "defer") => {
    setProcessingInsight(insightId);
    try {
      const res = await fetch(`/api/clients/${params.id}/clarity/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId, action }),
      });

      if (res.ok) {
        // Remove from pending list
        setInsights((prev) => prev.filter((i) => i.id !== insightId));
        // Refresh doc if accepted (to get updated values)
        if (action === "accept") {
          fetchData();
        }
      }
    } catch (error) {
      console.error("Failed to process insight:", error);
    } finally {
      setProcessingInsight(null);
    }
  };

  const handleFieldStatusChange = async (fieldName: string, status: "draft" | "confirmed" | "locked") => {
    try {
      const res = await fetch(`/api/clients/${params.id}/clarity/field-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName, status }),
      });

      if (res.ok) {
        const updatedDoc = await res.json();
        setDoc(updatedDoc);
      }
    } catch (error) {
      console.error("Failed to update field status:", error);
    }
  };

  const getFieldStatus = (fieldName: string): ClarityFieldMeta | undefined => {
    return doc?.fieldMeta?.[fieldName];
  };

  const getFieldStatusBadge = (fieldName: string) => {
    const meta = getFieldStatus(fieldName);
    if (!meta) return null;

    switch (meta.status) {
      case "draft":
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            Draft
          </Badge>
        );
      case "confirmed":
        return (
          <Badge variant="default" className="gap-1 text-xs bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="outline" className="gap-1 text-xs border-primary">
            <LockIcon className="h-3 w-3" />
            Locked
          </Badge>
        );
    }
  };

  const getFieldNameDisplay = (fieldName: string) => {
    const displayNames: Record<string, string> = {
      niche: "Niche",
      desiredOutcome: "Desired Outcome",
      offer: "Offer",
      positioningStatement: "Positioning Statement",
      whoWeAre: "Who We Are",
      whatWeDo: "What We Do",
      howWeDoIt: "How We Do It",
      ourWedge: "Our Wedge",
      whyPeopleLoveUs: "Why People Love Us",
      howWeWillDie: "How We Will Die",
    };
    return displayNames[fieldName] || fieldName;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client || !doc) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  const positioningComplete = doc.niche && doc.desiredOutcome && doc.offer;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/clients/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {client.name}
        </Link>

        <div className="flex items-center gap-2">
          {/* Insights Bell */}
          <Button
            variant={showInsightsPanel ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInsightsPanel(!showInsightsPanel)}
            className="relative gap-2"
          >
            <Bell className="h-4 w-4" />
            Insights
            {insights.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                {insights.length}
              </span>
            )}
          </Button>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8" />
          Clarity Document
        </h1>
        <p className="text-muted-foreground mt-1">
          {client.company || client.name} - The evolving definition of who they are
        </p>
        {doc.updatedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Insights Panel */}
      {showInsightsPanel && (
        <Card className="mb-8 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-amber-600" />
                Pending Insights
                {insights.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{insights.length}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowInsightsPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              AI-suggested updates based on your sources and conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending insights. New suggestions will appear here as you add sources and have conversations.
              </p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <Card key={insight.id} className="bg-background">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {getFieldNameDisplay(insight.fieldName)}
                            </Badge>
                            {insight.confidence && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-2 line-clamp-2">
                            {insight.suggestedValue}
                          </p>
                          {insight.reasoning && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {insight.reasoning}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {insight.sourceType}
                            </Badge>
                            <span>
                              {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1"
                            onClick={() => handleInsightAction(insight.id, "accept")}
                            disabled={processingInsight === insight.id}
                          >
                            {processingInsight === insight.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => handleInsightAction(insight.id, "reject")}
                            disabled={processingInsight === insight.id}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs"
                            onClick={() => handleInsightAction(insight.id, "defer")}
                            disabled={processingInsight === insight.id}
                          >
                            <Clock className="h-3 w-3" />
                            Later
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Positioning Statement */}
      <Card className="mb-8 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Positioning Statement
          </CardTitle>
          <CardDescription>
            The one sentence that defines the business
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positioningComplete ? (
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-xl font-medium">
                We help <span className="text-primary font-bold">{doc.niche}</span> achieve{" "}
                <span className="text-primary font-bold">{doc.desiredOutcome}</span> with{" "}
                <span className="text-primary font-bold">{doc.offer}</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Fill in the components below to generate the positioning statement
            </p>
          )}

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Niche (Who they serve)
              </Label>
              <Input
                placeholder="e.g., B2B SaaS founders"
                value={doc.niche || ""}
                onChange={(e) => handleFieldChange("niche", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Desired Outcome
              </Label>
              <Input
                placeholder="e.g., product-market fit"
                value={doc.desiredOutcome || ""}
                onChange={(e) => handleFieldChange("desiredOutcome", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Offer (How they deliver)
              </Label>
              <Input
                placeholder="e.g., a 90-day sprint program"
                value={doc.offer || ""}
                onChange={(e) => handleFieldChange("offer", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Fundamentals */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className={getFieldStatus("whoWeAre")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Who We Are</CardTitle>
              <FieldStatusControl
                fieldName="whoWeAre"
                status={getFieldStatus("whoWeAre")?.status}
                hasContent={!!doc.whoWeAre}
                onChange={handleFieldStatusChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Identity, values, mission..."
              value={doc.whoWeAre || ""}
              onChange={(e) => handleFieldChange("whoWeAre", e.target.value)}
              rows={4}
              disabled={getFieldStatus("whoWeAre")?.status === "locked"}
              className={getFieldStatus("whoWeAre")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>

        <Card className={getFieldStatus("whatWeDo")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">What We Do</CardTitle>
              <FieldStatusControl
                fieldName="whatWeDo"
                status={getFieldStatus("whatWeDo")?.status}
                hasContent={!!doc.whatWeDo}
                onChange={handleFieldStatusChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Core offering, services..."
              value={doc.whatWeDo || ""}
              onChange={(e) => handleFieldChange("whatWeDo", e.target.value)}
              rows={4}
              disabled={getFieldStatus("whatWeDo")?.status === "locked"}
              className={getFieldStatus("whatWeDo")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>

        <Card className={getFieldStatus("howWeDoIt")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">How We Do It</CardTitle>
              <FieldStatusControl
                fieldName="howWeDoIt"
                status={getFieldStatus("howWeDoIt")?.status}
                hasContent={!!doc.howWeDoIt}
                onChange={handleFieldStatusChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Process, methodology, approach..."
              value={doc.howWeDoIt || ""}
              onChange={(e) => handleFieldChange("howWeDoIt", e.target.value)}
              rows={4}
              disabled={getFieldStatus("howWeDoIt")?.status === "locked"}
              className={getFieldStatus("howWeDoIt")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>

        <Card className={getFieldStatus("ourWedge")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Our Wedge
              </CardTitle>
              <FieldStatusControl
                fieldName="ourWedge"
                status={getFieldStatus("ourWedge")?.status}
                hasContent={!!doc.ourWedge}
                onChange={handleFieldStatusChange}
              />
            </div>
            <CardDescription>The unique differentiator</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What makes us different, our unfair advantage..."
              value={doc.ourWedge || ""}
              onChange={(e) => handleFieldChange("ourWedge", e.target.value)}
              rows={4}
              disabled={getFieldStatus("ourWedge")?.status === "locked"}
              className={getFieldStatus("ourWedge")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>

        <Card className={getFieldStatus("whyPeopleLoveUs")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Why People Love Us
              </CardTitle>
              <FieldStatusControl
                fieldName="whyPeopleLoveUs"
                status={getFieldStatus("whyPeopleLoveUs")?.status}
                hasContent={!!doc.whyPeopleLoveUs}
                onChange={handleFieldStatusChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What customers say, emotional resonance..."
              value={doc.whyPeopleLoveUs || ""}
              onChange={(e) => handleFieldChange("whyPeopleLoveUs", e.target.value)}
              rows={4}
              disabled={getFieldStatus("whyPeopleLoveUs")?.status === "locked"}
              className={getFieldStatus("whyPeopleLoveUs")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>

        <Card className={getFieldStatus("howWeWillDie")?.status === "locked" ? "border-primary/50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Skull className="h-4 w-4 text-destructive" />
                How We Will Die
              </CardTitle>
              <FieldStatusControl
                fieldName="howWeWillDie"
                status={getFieldStatus("howWeWillDie")?.status}
                hasContent={!!doc.howWeWillDie}
                onChange={handleFieldStatusChange}
              />
            </div>
            <CardDescription>Existential risks and threats</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Biggest risks, competitive threats, failure modes..."
              value={doc.howWeWillDie || ""}
              onChange={(e) => handleFieldChange("howWeWillDie", e.target.value)}
              rows={4}
              disabled={getFieldStatus("howWeWillDie")?.status === "locked"}
              className={getFieldStatus("howWeWillDie")?.status === "locked" ? "bg-muted" : ""}
            />
          </CardContent>
        </Card>
      </div>

      {/* Locked-In Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Locked-In Insights
            </h2>
            <p className="text-sm text-muted-foreground">
              Key decisions and insights that are now set in stone
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSection(!showAddSection)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Insight
          </Button>
        </div>

        {showAddSection && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g., Target Customer Profile"
                  value={newSection.title}
                  onChange={(e) =>
                    setNewSection({ ...newSection, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="The insight or decision..."
                  value={newSection.content}
                  onChange={(e) =>
                    setNewSection({ ...newSection, content: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSection}>
                  <Lock className="h-4 w-4 mr-1" />
                  Lock It In
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddSection(false);
                    setNewSection({ title: "", content: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {doc.sections && doc.sections.length > 0 ? (
          <div className="space-y-3">
            {doc.sections.map((section) => (
              <Card key={section.id} className="bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      {section.title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Locked {formatDistanceToNow(new Date(section.lockedAt), { addSuffix: true })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          !showAddSection && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Lock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No locked-in insights yet. As you work with this client,
                  add key decisions and insights here.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* AI Chat Link */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-4 py-6">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold">Talk to the Clarity Doc</h3>
            <p className="text-sm text-muted-foreground">
              Use AI chat to explore, refine, and add to this document based on your conversations.
            </p>
          </div>
          <Link href={`/chat?client=${params.id}`}>
            <Button variant="outline">
              Open Chat
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
