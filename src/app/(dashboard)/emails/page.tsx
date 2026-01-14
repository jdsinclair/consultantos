"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Paperclip,
  User,
  Calendar,
  Inbox,
  Archive,
  CheckCircle,
  Search,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboundEmail {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  attachments: Array<{ filename: string; size: number }> | null;
  status: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  createdAt: string;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [filter, setFilter] = useState<"inbox" | "processed" | "archived">("inbox");

  useEffect(() => {
    fetchEmails();
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

  const handleAssignToClient = async (emailId: string, clientId: string) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_to_sources", clientId }),
      });
      fetchEmails();
      setSelectedEmail(null);
    } catch (error) {
      console.error("Failed to assign email:", error);
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
                    Assign this email and its attachments to a client:
                  </p>
                  <Button className="w-full gap-2">
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
    </div>
  );
}
