"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Paperclip,
  User,
  Calendar,
  Inbox,
  Archive,
  Search,
  ArrowRight,
  Loader2,
  FileText,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboundEmail {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  attachments: Array<{ id: string; filename: string; size: number; contentType: string }> | null;
  status: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
}

const SOURCE_CATEGORIES = [
  { value: "client_docs", label: "Client Documents" },
  { value: "meeting_notes", label: "Meeting Notes" },
  { value: "competitor_info", label: "Competitor Info" },
  { value: "reference", label: "Reference Material" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [filter, setFilter] = useState<"inbox" | "processed" | "archived">("inbox");

  // Assign dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sourceCategory, setSourceCategory] = useState<string>("client_docs");
  const [excludeFromRag, setExcludeFromRag] = useState(false);
  const [excludeReason, setExcludeReason] = useState("");

  useEffect(() => {
    fetchEmails();
    fetchClients();
  }, [filter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails?status=${filter}`);
      const data = await res.json();
      setEmails(data);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const openAssignDialog = () => {
    setSelectedClientId("");
    setSourceCategory("client_docs");
    setExcludeFromRag(false);
    setExcludeReason("");
    setShowAssignDialog(true);
  };

  const handleAssignToClient = async () => {
    if (!selectedEmail || !selectedClientId) return;

    setAssignLoading(true);
    try {
      const res = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_to_sources",
          clientId: selectedClientId,
          sourceCategory,
          excludeFromRag,
          excludeReason: excludeFromRag ? excludeReason : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign");

      setShowAssignDialog(false);
      fetchEmails();
      setSelectedEmail(null);
    } catch (error) {
      console.error("Failed to assign email:", error);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleArchive = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      fetchEmails();
      setSelectedEmail(null);
    } catch (error) {
      console.error("Failed to archive email:", error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold mb-4">Email Inbox</h1>
          <div className="flex gap-2 mb-4">
            {(["inbox", "processed", "archived"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search emails..." className="pl-10" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No emails in {filter}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Forward emails to your ingest address to see them here
              </p>
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`w-full p-4 text-left border-b border-border hover:bg-accent/50 transition-colors ${
                  selectedEmail?.id === email.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium truncate">
                    {email.fromName || email.fromEmail}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm font-medium truncate mb-1">
                  {email.subject || "(No subject)"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {email.bodyText?.slice(0, 100) || "(No content)"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {email.attachments && email.attachments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {email.attachments.length}
                    </Badge>
                  )}
                  {email.client && (
                    <Badge variant="outline" className="text-xs">
                      {email.client.name}
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 overflow-auto">
        {selectedEmail ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {selectedEmail.subject || "(No subject)"}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedEmail.fromName || selectedEmail.fromEmail}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(selectedEmail.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(selectedEmail.id)}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              </div>
            </div>

            {/* Attachments */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <Card className="mb-6">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({selectedEmail.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att, i) => (
                      <Badge key={i} variant="secondary">
                        {att.filename}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Body */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedEmail.bodyText || "(No content)"}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {selectedEmail.status === "inbox" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Assign this email and its attachments to a client. The content will be processed for AI context.
                  </p>
                  <Button className="w-full gap-2" onClick={openAssignDialog}>
                    <FileText className="h-4 w-4" />
                    Add to Client Sources
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an email to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Assign to Client Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add to Client Sources</DialogTitle>
            <DialogDescription>
              Assign this email and its attachments to a client. The content will be indexed for AI context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Client Selector */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exclude from RAG */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="excludeRag"
                  checked={excludeFromRag}
                  onCheckedChange={(checked) => setExcludeFromRag(checked === true)}
                />
                <Label htmlFor="excludeRag" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Exclude from AI context
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Check this for competitor decks, confidential info, or content that shouldn&apos;t be used in AI responses.
              </p>

              {excludeFromRag && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Textarea
                    id="reason"
                    value={excludeReason}
                    onChange={(e) => setExcludeReason(e.target.value)}
                    placeholder="e.g., Competitor pricing deck - for reference only"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            {selectedEmail && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium">Will add:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email body: {selectedEmail.subject || "(No subject)"}
                  </li>
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <li className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3" />
                      {selectedEmail.attachments.length} attachment(s)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignToClient}
              disabled={!selectedClientId || assignLoading}
            >
              {assignLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add to Sources"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
