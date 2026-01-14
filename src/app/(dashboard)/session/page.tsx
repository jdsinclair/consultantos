"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  Plus,
  Calendar,
  Clock,
  Users,
  Search,
  ChevronDown,
  Loader2,
  Play,
  FileText,
  History,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

interface Session {
  id: string;
  title: string;
  status: string;
  duration: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    company: string | null;
  } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter, clientFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (clientFilter) params.set("clientId", clientFilter);

      const [sessionsRes, clientsRes] = await Promise.all([
        fetch(`/api/sessions?${params.toString()}`),
        fetch("/api/clients"),
      ]);

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(query) ||
      session.client?.name.toLowerCase().includes(query) ||
      session.client?.company?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500 hover:bg-red-600">LIVE</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Sessions</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your consulting calls and meetings
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/session/historic" className="w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Add Historic</span>
              <span className="sm:hidden">Historic</span>
            </Button>
          </Link>
          <Link href="/session/new" className="w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Start New Session</span>
              <span className="sm:hidden">New Session</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="flex-shrink-0"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "scheduled" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("scheduled")}
            className="flex-shrink-0"
          >
            Scheduled
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
            className="flex-shrink-0"
          >
            Completed
          </Button>

          <div className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowClientDropdown(!showClientDropdown)}
            >
              <Users className="h-4 w-4 hidden sm:block" />
              <span className="max-w-[100px] sm:max-w-none truncate">
                {clientFilter
                  ? clients.find((c) => c.id === clientFilter)?.name
                  : "All Clients"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showClientDropdown && (
              <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-48 bg-popover border rounded-md shadow-lg z-10 max-h-60 overflow-auto">
                <div
                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                  onClick={() => {
                    setClientFilter(null);
                    setShowClientDropdown(false);
                  }}
                >
                  All Clients
                </div>
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm truncate"
                    onClick={() => {
                      setClientFilter(client.id);
                      setShowClientDropdown(false);
                    }}
                  >
                    {client.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      {session.status === "live" ? (
                        <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 animate-pulse" />
                      ) : (
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/session/${session.id}`}
                          className="font-medium hover:text-primary truncate"
                        >
                          {session.title}
                        </Link>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        {session.client && (
                          <Link
                            href={`/clients/${session.client.id}`}
                            className="hover:text-primary flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            <span className="truncate max-w-[100px] sm:max-w-none">{session.client.name}</span>
                          </Link>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {session.startedAt
                            ? format(new Date(session.startedAt), "MMM d, yyyy")
                            : session.scheduledAt
                            ? format(new Date(session.scheduledAt), "MMM d, yyyy")
                            : formatDistanceToNow(new Date(session.createdAt), {
                                addSuffix: true,
                              })}
                        </span>
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    {session.status === "scheduled" && (
                      <Link href={`/session/${session.id}`} className="flex-1 sm:flex-none">
                        <Button size="sm" className="gap-1 w-full sm:w-auto">
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                      </Link>
                    )}
                    {session.status === "live" && (
                      <Link href={`/session/${session.id}`} className="flex-1 sm:flex-none">
                        <Button size="sm" variant="destructive" className="gap-1 w-full sm:w-auto">
                          <Mic className="h-4 w-4" />
                          Join
                        </Button>
                      </Link>
                    )}
                    {session.status === "completed" && (
                      <Link href={`/session/${session.id}`} className="flex-1 sm:flex-none">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Mic className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || statusFilter || clientFilter
              ? "No sessions found"
              : "No sessions yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {searchQuery || statusFilter || clientFilter
              ? "Try adjusting your search or filters"
              : "Start a session to record and transcribe your client calls with AI assistance"}
          </p>
          {!searchQuery && !statusFilter && !clientFilter && (
            <Link href="/session/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Start Your First Session
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      {filteredSessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{sessions.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {
                  sessions.filter((s) => {
                    const date = new Date(s.createdAt);
                    const now = new Date();
                    return (
                      date.getMonth() === now.getMonth() &&
                      date.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatDuration(
                  sessions.reduce((acc, s) => acc + (s.duration || 0), 0)
                ) || "0 min"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Unique Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {new Set(sessions.map((s) => s.client?.id).filter(Boolean)).size}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
