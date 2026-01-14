import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Users, CheckCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  // Mock data - will come from DB
  const upcomingSessions = [
    { id: "1", client: "Pathogen Detection Co", title: "Florida State Sales Prep", time: "2:00 PM" },
    { id: "2", client: "SaaS Startup", title: "Q1 Strategy Review", time: "4:30 PM" },
  ];

  const recentActions = [
    { id: "1", title: "Send one-pager to Florida contact", client: "Pathogen Detection Co", due: "Tomorrow" },
    { id: "2", title: "Review AOAC documentation", client: "Pathogen Detection Co", due: "Friday" },
    { id: "3", title: "Update CRM sequences", client: "Sales Tech", due: "Next Week" },
  ];

  const activeClients = [
    { id: "1", name: "Pathogen Detection Co", status: "active", lastSession: "Yesterday" },
    { id: "2", name: "SaaS Startup", status: "active", lastSession: "3 days ago" },
    { id: "3", name: "E-commerce Brand", status: "active", lastSession: "1 week ago" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-4">
        <Link href="/session">
          <Button size="lg" className="gap-2">
            <Mic className="h-5 w-5" />
            Start Live Session
          </Button>
        </Link>
        <Link href="/clients/new">
          <Button size="lg" variant="outline" className="gap-2">
            <Users className="h-5 w-5" />
            Add Client
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Sessions
            </CardTitle>
            <CardDescription>Scheduled calls and meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">{session.client}</p>
                  </div>
                  <Badge variant="secondary">{session.time}</Badge>
                </div>
              ))}
              {upcomingSessions.length === 0 && (
                <p className="text-sm text-muted-foreground">No sessions scheduled today</p>
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
              {recentActions.map((action) => (
                <div key={action.id} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.client} · Due: {action.due}
                    </p>
                  </div>
                </div>
              ))}
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
              {activeClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between hover:bg-accent rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last session: {client.lastSession}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
