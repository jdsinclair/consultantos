"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { Plus, Globe, FolderGit2, Folder, Loader2 } from "lucide-react";

interface SourceAdderProps {
  clientId: string;
  onSourceAdded?: () => void;
}

export function SourceAdder({ clientId, onSourceAdded }: SourceAdderProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "website" | "repo" | "folder" | null>(null);
  const [url, setUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddSource = async (type: string, data: { url?: string; localPath?: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: data.url || data.localPath || "New Source",
          url: data.url,
          localPath: data.localPath,
        }),
      });

      if (!res.ok) throw new Error("Failed to add source");

      const source = await res.json();

      // Trigger processing
      await fetch(`/api/sources/${source.id}/process`, {
        method: "POST",
      });

      onSourceAdded?.();
      setOpen(false);
      setMode(null);
      setUrl("");
      setLocalPath("");
    } catch (error) {
      console.error("Failed to add source:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-3 w-3" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>

        {!mode ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("upload")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Upload Files</span>
            </button>
            <button
              onClick={() => setMode("website")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <Globe className="h-6 w-6" />
              <span className="text-sm font-medium">Website</span>
            </button>
            <button
              onClick={() => setMode("repo")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <FolderGit2 className="h-6 w-6" />
              <span className="text-sm font-medium">GitHub Repo</span>
            </button>
            <button
              onClick={() => setMode("folder")}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
            >
              <Folder className="h-6 w-6" />
              <span className="text-sm font-medium">Local Folder</span>
            </button>
          </div>
        ) : mode === "upload" ? (
          <div className="space-y-4">
            <FileUpload
              clientId={clientId}
              onUploadComplete={() => {
                onSourceAdded?.();
                setOpen(false);
                setMode(null);
              }}
            />
            <Button variant="ghost" onClick={() => setMode(null)}>
              Back
            </Button>
          </div>
        ) : mode === "website" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll automatically crawl the sitemap and extract content from all pages.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button
                onClick={() => handleAddSource("website", { url })}
                disabled={!url || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Website
              </Button>
            </div>
          </div>
        ) : mode === "repo" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>GitHub Repository URL</Label>
              <Input
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll index the README and key documentation files.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button
                onClick={() => handleAddSource("repo", { url })}
                disabled={!url || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Repository
              </Button>
            </div>
          </div>
        ) : mode === "folder" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Local Folder Path</Label>
              <Input
                placeholder="/Users/you/Documents/client-files"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Local folder sync requires the ConsultantOS desktop agent (coming soon).
                For now, the path will be saved for future sync.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button
                onClick={() => handleAddSource("local_folder", { localPath })}
                disabled={!localPath || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Path
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
