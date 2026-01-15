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
import { TrendingUp, Clock, Users, DollarSign, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: string;
  dealValue?: number | null;
  dealStatus?: string | null;
  hourlyRate?: number | null;
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
  const [useWorkweekMode, setUseWorkweekMode] = useState(true); // true = Workweek 40hrs, false = 2hrs per client

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

  // Filter to only active clients
  const activeClients = clients.filter((c) => c.status === "active");
  const clientsWithRates = activeClients.filter((c) => c.hourlyRate && c.hourlyRate > 0);

  // Calculate average hourly rate (in cents)
  const totalHourlyRate = clientsWithRates.reduce(
    (sum, c) => sum + (c.hourlyRate || 0),
    0
  );
  const avgHourlyRate =
    clientsWithRates.length > 0 ? totalHourlyRate / clientsWithRates.length : 0;

  // Calculate hours per week based on mode
  const hoursPerWeek = useWorkweekMode ? 40 : 2 * clientsWithRates.length;

  // Revenue calculations (all in cents, convert to dollars for display)
  const weeklyRevenue = useWorkweekMode
    ? avgHourlyRate * 40 // Workweek: average rate * 40 hours
    : totalHourlyRate * 2; // Per client: sum of rates * 2 hours each

  const hrr = avgHourlyRate; // Hourly Recurring Revenue
  const drr = weeklyRevenue / 5; // Daily (5 work days)
  const wrr = weeklyRevenue; // Weekly
  const mrr = weeklyRevenue * 4.33; // Monthly (avg weeks per month)
  const arr = weeklyRevenue * 52; // Annual

  // Deal status aggregations
  const pendingDeals = activeClients.filter(
    (c) => c.dealStatus === "placeholder" || c.dealStatus === "none"
  );
  const presentedDeals = activeClients.filter(
    (c) => c.dealStatus === "presented"
  );
  const activeDeals = activeClients.filter((c) => c.dealStatus === "active");

  const pendingValue = pendingDeals.reduce(
    (sum, c) => sum + (c.dealValue || 0),
    0
  );
  const presentedValue = presentedDeals.reduce(
    (sum, c) => sum + (c.dealValue || 0),
    0
  );
  const activeValue = activeDeals.reduce(
    (sum, c) => sum + (c.dealValue || 0),
    0
  );

  // Format currency (cents to dollars)
  const formatCurrency = (cents: number) => {
    const dollars = cents / 100;
    if (dollars >= 1000000) {
      return `$${(dollars / 1000000).toFixed(2)}M`;
    }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue Overview
          </DialogTitle>
          <DialogDescription>
            {activeClients.length} active client{activeClients.length !== 1 ? "s" : ""}{" "}
            {clientsWithRates.length > 0 && (
              <span className="text-muted-foreground">
                ({clientsWithRates.length} with hourly rates)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Calculation Mode</span>
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
              Based on {hoursPerWeek} billable hours/week
              {!useWorkweekMode && clientsWithRates.length > 0 && (
                <span> (2 hrs × {clientsWithRates.length} clients)</span>
              )}
            </div>

            {/* Revenue Metrics Grid */}
            {clientsWithRates.length > 0 ? (
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
                        {formatCurrency(arr)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">annual recurring revenue</div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500/50" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No clients with hourly rates set</p>
                <p className="text-xs mt-1">Add hourly rates to your clients to see revenue projections</p>
              </div>
            )}

            {/* Deal Pipeline */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Deal Pipeline</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Pending */}
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Pending
                  </div>
                  <div className="text-sm font-semibold">
                    {formatCurrencyFull(pendingValue)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {pendingDeals.length} deal{pendingDeals.length !== 1 ? "s" : ""}
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
                    {presentedDeals.length} deal{presentedDeals.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Active */}
                <div className="p-2 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                  <div className="text-[10px] text-green-600 uppercase tracking-wider font-medium">
                    Active
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {formatCurrencyFull(activeValue)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
