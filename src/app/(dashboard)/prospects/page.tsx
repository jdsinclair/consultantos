"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ContactRound,
  Mail,
  Phone,
  Building2,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DealValueBadge, DealStatusBadge } from "@/components/deal-badge";

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  dealValue: number | null;
  dealStatus: string | null;
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
  const [deleteTarget, setDeleteTarget] = useState<Prospect | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleDeleteClick = (prospect: Prospect) => {
    setDeleteTarget(prospect);
    setDeleteConfirmStep(1);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2);
      return;
    }
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      setProspects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setDeleteConfirmStep(0);
    }
  };

  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const hasContactInfo = (p: Prospect) => p.email || p.phone || p.company || p.website;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Prospects</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Evaluate potential clients before they become engagements
          </p>
        </div>
        <Link href="/prospects/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Prospect
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6 relative sm:max-w-md">
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
                  <div className="flex items-start gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {prospect.name}
                        <DealValueBadge value={prospect.dealValue} />
                      </CardTitle>
                      {prospect.company && (
                        <CardDescription>{prospect.company}</CardDescription>
                      )}
                    </div>
                    {/* Contact Card Popover */}
                    {hasContactInfo(prospect) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <ContactRound className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <div className="space-y-2">
                            {prospect.email && (
                              <button
                                onClick={() => handleCopy(prospect.email!, `${prospect.id}-email`)}
                                className="flex items-center gap-2 w-full text-left text-sm hover:bg-muted p-1.5 rounded transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1">{prospect.email}</span>
                                {copiedField === `${prospect.id}-email` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            {prospect.phone && (
                              <button
                                onClick={() => handleCopy(prospect.phone!, `${prospect.id}-phone`)}
                                className="flex items-center gap-2 w-full text-left text-sm hover:bg-muted p-1.5 rounded transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1">{prospect.phone}</span>
                                {copiedField === `${prospect.id}-phone` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            {prospect.company && (
                              <button
                                onClick={() => handleCopy(prospect.company!, `${prospect.id}-company`)}
                                className="flex items-center gap-2 w-full text-left text-sm hover:bg-muted p-1.5 rounded transition-colors"
                              >
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1">{prospect.company}</span>
                                {copiedField === `${prospect.id}-company` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            {prospect.website && (
                              <button
                                onClick={() => handleCopy(prospect.website!, `${prospect.id}-website`)}
                                className="flex items-center gap-2 w-full text-left text-sm hover:bg-muted p-1.5 rounded transition-colors"
                              >
                                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1">{prospect.website}</span>
                                {copiedField === `${prospect.id}-website` ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {prospect.evaluation && (
                      <div className={`flex items-center gap-1 font-bold ${getFitScoreColor(prospect.evaluation.fitScore)}`}>
                        <Star className="h-4 w-4 fill-current" />
                        {prospect.evaluation.fitScore}/10
                      </div>
                    )}
                    <DealStatusBadge dealStatus={prospect.dealStatus} status={prospect.status} />
                  </div>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(prospect)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link href={`/prospects/${prospect.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
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

      {/* Delete Confirmation Dialog - Double Confirm */}
      <AlertDialog open={deleteConfirmStep > 0} onOpenChange={(open) => !open && setDeleteConfirmStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmStep === 1 ? "Delete Prospect?" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmStep === 1 ? (
                <>
                  This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated data
                  (sources, notes, evaluations).
                </>
              ) : (
                <>
                  This action cannot be undone. All data for <strong>{deleteTarget?.name}</strong> will be
                  permanently removed from the system.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmStep(0)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : deleteConfirmStep === 1 ? (
                "Yes, Delete"
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
