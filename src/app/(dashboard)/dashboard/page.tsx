"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Users, CheckCircle, Clock, ArrowRight, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Client {
  id: string;
  name: string;
  company: string | null;
  status: string;
  updatedAt: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  client: { name: string } | null;
}

interface ActionItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  client: { name: string } | null;
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, sessionsRes, actionsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/sessions?status=scheduled&limit=5"),
          fetch("/api/action-items?status=pending&limit=5"),
        ]);

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data.slice(0, 5));
        }
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data);
        }
        if (actionsRes.ok) {
          const data = await actionsRes.json();
          setActionItems(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleAction = async (id: string, completed: boolean) => {
    try {
      await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
          completedAt: completed ? new Date().toISOString() : null,
        }),
      });
      setActionItems((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("Failed to update action item:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Link href="/session/new" className="flex-1 sm:flex-none">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            <Mic className="h-5 w-5" />
            Start Live Session
          </Button>
        </Link>
        <Link href="/clients/new" className="flex-1 sm:flex-none">
          <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
            <Users className="h-5 w-5" />
            Add Client
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>Scheduled calls and meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/session/${session.id}`}
                    className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.client?.name || "No client"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {session.scheduledAt
                        ? new Date(session.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "TBD"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No upcoming sessions</p>
                  <Link href="/session/new">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      Schedule Session
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Action Items
            </CardTitle>
            <CardDescription>Commitments from recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actionItems.length > 0 ? (
                actionItems.map((action) => (
                  <div key={action.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-600 cursor-pointer"
                      onChange={(e) => handleToggleAction(action.id, e.target.checked)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.client?.name || "General"}
                        {action.dueDate && (
                          <> · Due: {formatDistanceToNow(new Date(action.dueDate), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                    {action.priority === "high" && (
                      <Badge variant="destructive" className="text-xs">High</Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending action items
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Clients
            </CardTitle>
            <CardDescription>Current engagements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No clients yet</p>
                  <Link href="/clients/new">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add Client
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
