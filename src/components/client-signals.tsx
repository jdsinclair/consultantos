"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Sparkles,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, isPast, isWithinInterval, addDays } from "date-fns";
import Link from "next/link";
import { NoteDialog } from "./note-dialog";
import { cn } from "@/lib/utils";

interface ClientSignalsProps {
  clientId: string;
  clientName: string;
}

interface DiscussionNote {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
}

interface OverdueItem {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

interface RecentInsight {
  id: string;
  fieldName: string;
  suggestedValue: string;
  sourceContext: string;
  createdAt: string;
}

interface SignalsData {
  discussionNotes: DiscussionNote[];
  overdueItems: OverdueItem[];
  upcomingSessions: Array<{ id: string; title: string; scheduledAt: string }>;
  recentInsights: RecentInsight[];
  pendingInsightsCount: number;
  lastSessionDaysAgo: number | null;
}

export function ClientSignals({ clientId, clientName }: ClientSignalsProps) {
  const [signals, setSignals] = useState<SignalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const [notesRes, actionsRes, sessionsRes, insightsRes] = await Promise.all([
          fetch(`/api/notes?clientId=${clientId}&noteType=discussion&limit=5`),
          fetch(`/api/action-items?clientId=${clientId}&status=pending`),
          fetch(`/api/sessions?clientId=${clientId}&status=scheduled&limit=3`),
          fetch(`/api/clients/${clientId}/clarity/insights?status=pending&limit=3`),
        ]);

        const discussionNotes: DiscussionNote[] = notesRes.ok ? await notesRes.json() : [];
        const allActions = actionsRes.ok ? await actionsRes.json() : [];
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

        let recentInsights: RecentInsight[] = [];
        let pendingInsightsCount = 0;
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          recentInsights = insightsData.insights || [];
          pendingInsightsCount = insightsData.total || 0;
        }

        // Filter overdue items
        const overdueItems = allActions.filter((item: OverdueItem) =>
          item.dueDate && isPast(new Date(item.dueDate))
        ).slice(0, 3);

        // Calculate days since last session
        const sessionsListRes = await fetch(`/api/sessions?clientId=${clientId}&limit=1`);
        let lastSessionDaysAgo: number | null = null;
        if (sessionsListRes.ok) {
          const recentSessions = await sessionsListRes.json();
          if (recentSessions.length > 0) {
            const lastDate = new Date(recentSessions[0].createdAt);
            lastSessionDaysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        setSignals({
          discussionNotes,
          overdueItems,
          upcomingSessions: sessions,
          recentInsights,
          pendingInsightsCount,
          lastSessionDaysAgo,
        });
      } catch (error) {
        console.error("Failed to fetch signals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [clientId]);

  const handleNoteCreated = () => {
    // Refresh discussion notes
    fetch(`/api/notes?clientId=${clientId}&noteType=discussion&limit=5`)
      .then(res => res.json())
      .then(notes => {
        if (signals) {
          setSignals({ ...signals, discussionNotes: notes });
        }
      });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!signals) return null;

  const {
    discussionNotes,
    overdueItems,
    upcomingSessions,
    recentInsights,
    pendingInsightsCount,
    lastSessionDaysAgo,
  } = signals;

  // Determine if we have enough content to show
  const hasContent =
    discussionNotes.length > 0 ||
    overdueItems.length > 0 ||
    recentInsights.length > 0 ||
    (lastSessionDaysAgo !== null && lastSessionDaysAgo > 14);

  // If no signals, show a minimal prompt
  if (!hasContent) {
    return (
      <Card className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 border-cyan-200/50 dark:border-cyan-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-cyan-600" />
            Client Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Capture thoughts to discuss in your next call with {clientName}.
          </p>
          <NoteDialog
            clientId={clientId}
            onNoteCreated={handleNoteCreated}
            trigger={
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-3 w-3" />
                Add Discussion Topic
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 border-cyan-200/50 dark:border-cyan-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-cyan-600" />
            Client Signals
          </span>
          <NoteDialog
            clientId={clientId}
            onNoteCreated={handleNoteCreated}
            trigger={
              <Button size="sm" variant="ghost" className="gap-1 h-7">
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Topic</span>
              </Button>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Call Discussion Topics */}
        {discussionNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-3.5 w-3.5 text-cyan-600" />
              <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
                Next Call Topics
              </span>
              <Badge variant="secondary" className="text-xs h-5">
                {discussionNotes.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {discussionNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-2 rounded-md bg-white/60 dark:bg-gray-900/40 text-sm"
                >
                  <p className="font-medium text-sm line-clamp-1">
                    {note.title || note.content.slice(0, 50)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Items */}
        {overdueItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                Overdue Items
              </span>
            </div>
            <div className="space-y-1.5">
              {overdueItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md bg-orange-50/60 dark:bg-orange-950/20 text-sm"
                >
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs ml-2",
                      item.priority === "high" || item.priority === "urgent"
                        ? "border-red-300 text-red-600"
                        : "border-orange-300 text-orange-600"
                    )}
                  >
                    {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Clarity Insights */}
        {pendingInsightsCount > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                Clarity Insights Ready
              </span>
            </div>
            <Link href={`/clients/${clientId}/clarity`}>
              <div className="p-2 rounded-md bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-950/40 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {pendingInsightsCount} new insight{pendingInsightsCount !== 1 ? 's' : ''} to review
                  </span>
                  <ChevronRight className="h-4 w-4 text-purple-500" />
                </div>
                {recentInsights.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    Latest: {recentInsights[0].fieldName} - &quot;{recentInsights[0].suggestedValue.slice(0, 40)}...&quot;
                  </p>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Time Since Last Session Warning */}
        {lastSessionDaysAgo !== null && lastSessionDaysAgo > 14 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50/60 dark:bg-amber-950/20">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {lastSessionDaysAgo} days since last session
            </span>
            <Link href={`/session/new?client=${clientId}`} className="ml-auto">
              <Button size="sm" variant="ghost" className="h-6 text-xs">
                Schedule
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
