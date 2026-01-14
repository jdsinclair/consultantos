"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Calendar, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DealValueBadge, DealStatusBadge } from "@/components/deal-badge";

interface Client {
  id: string;
  name: string;
  company: string | null;
  industry: string | null;
  status: string;
  description: string | null;
  dealValue: number | null;
  dealStatus: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sources: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your consulting engagements</p>
        </div>
        <Link href="/clients/new">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
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
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="flex-shrink-0"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "paused" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("paused")}
            className="flex-shrink-0"
          >
            Paused
          </Button>
        </div>
      </div>

      {/* Client Grid */}
      {filteredClients.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {client.name}
                        <DealValueBadge value={client.dealValue} />
                      </CardTitle>
                      {client.company && (
                        <p className="text-sm text-muted-foreground">{client.company}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                      <DealStatusBadge dealStatus={client.dealStatus} status={client.status} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {client.description}
                    </p>
                  )}
                  {client.industry && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {client.industry}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true })}
                    </div>
                    {client._count && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {client._count.sources} sources
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || statusFilter ? "No clients found" : "No clients yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter
              ? "Try adjusting your search or filters"
              : "Get started by adding your first client"}
          </p>
          {!searchQuery && !statusFilter && (
            <Link href="/clients/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
