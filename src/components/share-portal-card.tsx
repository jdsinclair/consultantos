"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Link2,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Rocket,
  Target,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SharedItem {
  id: string;
  itemType: string;
  itemId: string;
  displayName?: string;
  displayOrder: number;
  deepLinkToken?: string;
  viewCount?: number;
  isVisible: boolean;
}

interface Portal {
  id: string;
  accessToken: string;
  name?: string;
  welcomeMessage?: string;
  brandColor?: string;
  isActive: boolean;
  expiresAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
}

interface ShareableItem {
  id: string;
  type: "execution_plan" | "clarity_canvas" | "source" | "note";
  title: string;
  status?: string;
}

interface SharePortalCardProps {
  clientId: string;
  clientName: string;
  shareableItems: ShareableItem[];
}

export function SharePortalCard({
  clientId,
  clientName,
  shareableItems,
}: SharePortalCardProps) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);

  // Fetch portal data
  useEffect(() => {
    async function fetchPortal() {
      try {
        const res = await fetch(`/api/clients/${clientId}/portal`);
        if (res.ok) {
          const data = await res.json();
          if (data.portal) {
            setPortal(data.portal);
            setShareUrl(data.shareUrl);
            setSharedItems(data.portal.sharedItems || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch portal:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPortal();
  }, [clientId]);

  const handleCreatePortal = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${clientName}'s Workspace` }),
      });

      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Failed to create portal:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePortal = async () => {
    if (!portal) return;
    try {
      const res = await fetch(`/api/portals/${portal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !portal.isActive }),
      });

      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
      }
    } catch (error) {
      console.error("Failed to toggle portal:", error);
    }
  };

  const handleRegenerateLink = async () => {
    if (!portal) return;
    if (!confirm("This will invalidate the old link. Continue?")) return;

    try {
      const res = await fetch(`/api/portals/${portal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateToken: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setPortal(data.portal);
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Failed to regenerate link:", error);
    }
  };

  const handleAddItem = async (item: ShareableItem) => {
    if (!portal) return;
    try {
      const res = await fetch(`/api/portals/${portal.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: item.type,
          itemId: item.id,
          displayName: item.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSharedItems((prev) => [...prev, data.item]);
      }
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!portal) return;
    try {
      await fetch(`/api/portals/${portal.id}/items?itemId=${itemId}`, {
        method: "DELETE",
      });
      setSharedItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "execution_plan":
        return <Rocket className="h-4 w-4 text-orange-500" />;
      case "clarity_canvas":
        return <Target className="h-4 w-4 text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get items that aren't already shared
  const unsahredItems = shareableItems.filter(
    (item) => !sharedItems.some((s) => s.itemId === item.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Client Portal
        </CardTitle>
        {portal && (
          <div className="flex items-center gap-2">
            <Badge
              variant={portal.isActive ? "default" : "secondary"}
              className={cn(
                portal.isActive && "bg-green-500/20 text-green-500"
              )}
            >
              {portal.isActive ? "Active" : "Inactive"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePortal}>
                  <Eye className="h-4 w-4 mr-2" />
                  {portal.isActive ? "Disable Portal" : "Enable Portal"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRegenerateLink}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open(shareUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Portal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!portal ? (
          // No portal yet - show creation UI
          <div className="text-center py-6">
            <Share2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Create a secure portal to share plans and documents with{" "}
              {clientName}.
            </p>
            <Button onClick={handleCreatePortal} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Client Portal
            </Button>
          </div>
        ) : (
          // Portal exists - show management UI
          <div className="space-y-4">
            {/* Share URL */}
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(shareUrl, "_blank")}
                title="Open portal"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            {portal.accessCount && portal.accessCount > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Viewed {portal.accessCount} time
                  {portal.accessCount !== 1 && "s"}
                </span>
                {portal.lastAccessedAt && (
                  <span>
                    Last accessed:{" "}
                    {new Date(portal.lastAccessedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Shared Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Shared Items</p>
                <Dialog open={showAddItems} onOpenChange={setShowAddItems}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Items to Portal</DialogTitle>
                      <DialogDescription>
                        Select items to share with {clientName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {unsahredItems.length > 0 ? (
                        unsahredItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              handleAddItem(item);
                              setShowAddItems(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {getItemIcon(item.type)}
                              <div>
                                <p className="text-sm font-medium">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.type.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          All items are already shared.
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {sharedItems.length > 0 ? (
                <div className="space-y-2">
                  {sharedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 group"
                    >
                      <div className="flex items-center gap-2">
                        {getItemIcon(item.itemType)}
                        <span className="text-sm">
                          {item.displayName || "Untitled"}
                        </span>
                        {item.viewCount && item.viewCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {item.viewCount} views
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={async () => {
                            // Generate portal deep link that auto-selects this item
                            const url = `${window.location.origin}/portal/${portal.accessToken}?item=${item.itemId}`;
                            await navigator.clipboard.writeText(url);
                          }}
                          title="Copy direct link"
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove from portal"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4 border border-dashed rounded-lg">
                  No items shared yet. Add plans or documents to share.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
