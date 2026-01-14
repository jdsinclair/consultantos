"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Crosshair,
  Gauge,
  Layers,
  Search,
  Loader2,
  CheckCircle,
  Circle,
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: string;
  hasCanvas?: boolean;
  canvasPhase?: string;
}

export default function ClarityMethodLandingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        // Show all clients except lost/cancelled
        setClients(data.filter((c: Client) => 
          !['prospect_lost', 'client_cancelled'].includes(c.status)
        ));
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/methods"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Methods
      </Link>

      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Target className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Clarity Method™</h1>
            <p className="text-lg text-muted-foreground">
              Strategic Diagnosis + Execution Mapping for Founders
            </p>
          </div>
        </div>

        <div className="mt-6 p-6 bg-muted/30 rounded-xl border">
          <h2 className="font-semibold text-lg mb-2">The Method</h2>
          <p className="text-muted-foreground mb-4">
            Help founders move from <strong>chaos → clarity → constraint → execution</strong>
            {" "}without turning strategy into theater.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-red-500" />
              <span>Strategic Truth</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Crosshair className="h-4 w-4 text-blue-500" />
              <span>North Star</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-orange-500" />
              <span>Core Engine</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-green-500" />
              <span>Execution Swimlanes</span>
            </div>
          </div>
        </div>
      </div>

      {/* What This Produces */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Every client leaves with:</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              One visual truth of their business
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              One declared constraint
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              One defensible wedge
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              One execution map
            </li>
            <li className="flex items-center gap-2 text-sm col-span-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Reduced cognitive load & founder dependence
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Client Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Select a Client</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-3">
            {filteredClients.map((client) => (
              <Link key={client.id} href={`/methods/clarity/${client.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          {client.company && (
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {client.hasCanvas ? (
                          <Badge variant="secondary">
                            {client.canvasPhase === 'execution' ? 'Execution' :
                             client.canvasPhase === 'constraint' ? 'Constraint' : 'Diagnostic'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">New Canvas</Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No clients match your search" : "No active clients yet"}
              </p>
              {!searchQuery && (
                <Link href="/clients/new">
                  <Button className="mt-4">Add Your First Client</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
