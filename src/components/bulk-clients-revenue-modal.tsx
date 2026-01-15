"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, Users, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: string;
  dealValue?: number | null; // Monthly retainer in cents
  dealStatus?: string | null;
}

interface BulkClientsRevenueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkClientsRevenueModal({
  open,
  onOpenChange,
}: BulkClientsRevenueModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [useWorkweekMode, setUseWorkweekMode] = useState(false); // false = 2hrs per client (default), true = 40hr workweek

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients?status=active");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open, fetchClients]);

  // Filter to only active clients with deal values
  const activeClients = clients.filter((c) => c.status === "active");
  const clientsWithDeals = activeClients.filter((c) => c.dealValue && c.dealValue > 0);

  // MRR = Sum of all monthly retainers (dealValue is monthly)
  const mrr = clientsWithDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  // Calculate hours per month based on mode
  const numClients = clientsWithDeals.length;
  const hoursPerMonth = useWorkweekMode
    ? 160 // 40 hrs/week × 4 weeks
    : 8 * numClients; // 2 hrs/week × 4 weeks × numClients

  // Revenue calculations (all in cents)
  const hrr = hoursPerMonth > 0 ? mrr / hoursPerMonth : 0; // Hourly = Monthly / hours
  const wrr = mrr / 4.33; // Weekly = Monthly / weeks per month
  const drr = wrr / 5; // Daily = Weekly / 5 work days
  const arr = mrr * 12; // Annual = Monthly × 12

  // Deal status aggregations (for prospects/pipeline - not active clients)
  const pendingDeals = clients.filter(
    (c) => c.status !== "active" && (c.dealStatus === "placeholder" || c.dealStatus === "none")
  );
  const presentedDeals = clients.filter(
    (c) => c.status !== "active" && c.dealStatus === "presented"
  );

  const pendingValue = pendingDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const presentedValue = presentedDeals.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  // Format currency (cents to dollars)
  const formatCurrency = (cents: number) => {
    const dollars = cents / 100;
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(2)}M`;
    }
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}K`;
    }
    return `$${dollars.toFixed(2)}`;
  };

  const formatCurrencyCompact = (cents: number) => {
    const dollars = cents / 100;
    if (dollars >= 1000) {
      return `$${(dollars / 1000).toFixed(1)}K`;
    }
    return `$${dollars.toFixed(0)}`;
  };

  const formatCurrencyFull = (cents: number) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(dollars);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue Overview
          </DialogTitle>
          <DialogDescription>
            {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Client List with Monthly Values */}
            {clientsWithDeals.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium mb-2">Active Clients</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {clientsWithDeals.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded text-sm"
                    >
                      <span className="truncate flex-1 mr-2">
                        {client.name}
                        {client.company && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({client.company})
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-green-600 whitespace-nowrap">
                        {formatCurrencyFull(client.dealValue || 0)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">HRR Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs",
                    !useWorkweekMode ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  2hrs/client
                </span>
                <Switch
                  checked={useWorkweekMode}
                  onCheckedChange={setUseWorkweekMode}
                />
                <span
                  className={cn(
                    "text-xs",
                    useWorkweekMode ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  40hr week
                </span>
              </div>
            </div>

            {/* Hours Info */}
            <div className="text-center text-xs text-muted-foreground">
              {useWorkweekMode
                ? "Assuming 160 hrs/month (40hr weeks)"
                : `Assuming ${hoursPerMonth} hrs/month (2 hrs/week × ${numClients} clients)`
              }
            </div>

            {/* Revenue Metrics Grid */}
            {clientsWithDeals.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {/* HRR */}
                <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20">
                  <div className="text-xs text-muted-foreground font-medium">HRR</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(hrr)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">per hour</div>
                </div>

                {/* DRR */}
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20">
                  <div className="text-xs text-muted-foreground font-medium">DRR</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(drr)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">per day</div>
                </div>

                {/* WRR */}
                <div className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                  <div className="text-xs text-muted-foreground font-medium">WRR</div>
                  <div className="text-lg font-bold text-purple-600">
                    {formatCurrency(wrr)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">per week</div>
                </div>

                {/* MRR */}
                <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-lg border border-orange-500/20">
                  <div className="text-xs text-muted-foreground font-medium">MRR</div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(mrr)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">per month</div>
                </div>

                {/* ARR - Full Width */}
                <div className="col-span-2 p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">ARR</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {formatCurrencyCompact(arr)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">annual recurring revenue</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500/50" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active clients with deal values</p>
                <p className="text-xs mt-1">Add monthly values to your clients to see revenue</p>
              </div>
            )}

            {/* Pipeline - Pending & Presented */}
            {(pendingValue > 0 || presentedValue > 0) && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pipeline</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Pending */}
                  <div className="p-2 bg-muted/30 rounded-lg text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Pending
                    </div>
                    <div className="text-sm font-semibold">
                      {formatCurrencyFull(pendingValue)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {pendingDeals.length} prospect{pendingDeals.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Presented */}
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/20">
                    <div className="text-[10px] text-yellow-600 uppercase tracking-wider font-medium">
                      Presented
                    </div>
                    <div className="text-sm font-semibold text-yellow-600">
                      {formatCurrencyFull(presentedValue)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {presentedDeals.length} proposal{presentedDeals.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
