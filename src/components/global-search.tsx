"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Users,
  UserPlus,
  X,
  Globe,
  Building,
  Loader2,
} from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
  status: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search as you type
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    const path = result.status === "prospect"
      ? `/prospects/${result.id}`
      : `/clients/${result.id}`;
    router.push(path);
    setOpen(false);
    setQuery("");
    setResults([]);
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, handleSelect]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Quick find...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => {
          setOpen(false);
          setQuery("");
          setResults([]);
        }}
      />

      {/* Search Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="bg-popover border rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search clients by name, company, or URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 text-lg"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={() => {
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="max-h-80 overflow-auto">
              {results.map((result, i) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === selectedIndex
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {result.status === "prospect" ? (
                      <UserPlus className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{result.name}</p>
                      <Badge
                        variant={result.status === "prospect" ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {result.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {result.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Building className="h-3 w-3" />
                          {result.company}
                        </span>
                      )}
                      {result.website && (
                        <span className="flex items-center gap-1 truncate">
                          <Globe className="h-3 w-3" />
                          {result.website.replace(/^https?:\/\//, "").split("/")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : query.length < 2 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Type at least 2 characters to search
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted">↵</kbd> to select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted">esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
