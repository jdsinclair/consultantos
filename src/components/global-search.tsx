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

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Quick find...</span>
        <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-muted text-xs">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
        onClick={() => {
          setOpen(false);
          setQuery("");
          setResults([]);
        }}
      />

      {/* Search Modal - Full screen on mobile, centered on desktop */}
      <div className="fixed inset-4 sm:inset-auto sm:top-[15%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 flex flex-col">
        <div className="bg-card border-2 border-border rounded-2xl shadow-corporate-lg overflow-hidden flex flex-col max-h-full">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder="Search clients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 text-base sm:text-lg h-auto"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
            <button
              onClick={() => {
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((result, i) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === selectedIndex
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                      {result.status === "prospect" ? (
                        <UserPlus className="h-5 w-5 text-primary" />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{result.name}</p>
                        <Badge
                          variant={result.status === "prospect" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        {result.company && (
                          <span className="flex items-center gap-1 truncate">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{result.company}</span>
                          </span>
                        )}
                        {result.website && (
                          <span className="flex items-center gap-1 truncate">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{result.website.replace(/^https?:\/\//, "").split("/")[0]}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 && !loading ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : query.length < 2 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : null}
          </div>

          {/* Footer - hidden on mobile for more space */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground flex-shrink-0">
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
