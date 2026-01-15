"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Loader2,
  Calendar,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface SearchResult {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  content: string;
  similarity: number;
  sessionId?: string;
  sessionTitle?: string;
  sessionDate?: string;
  clientId: string;
  clientName?: string;
  matchType: "semantic" | "text";
}

interface TranscriptSearchProps {
  clientId?: string;
  placeholder?: string;
  className?: string;
  onResultClick?: (result: SearchResult) => void;
  compact?: boolean;
}

export function TranscriptSearch({
  clientId,
  placeholder = "Search transcripts...",
  className = "",
  onResultClick,
  compact = false,
}: TranscriptSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/transcripts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          clientId,
          limit: 10,
          minSimilarity: 0.5,
          sourceTypes: ["session_transcript", "session_notes"],
          includeTextSearch: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // Debounced search for typing
  const debouncedSearch = useCallback(
    (q: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        performSearch(q);
      }, 300);
    },
    [clientId]
  );

  const cancelDebouncedSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    debouncedSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      cancelDebouncedSearch();
      performSearch(query);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setIsOpen(false);
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setIsOpen(false);
  };

  // Highlight matching text in content
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-10 pr-8"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && (searched || loading) && (
          <Card className="absolute z-50 w-full mt-1 max-h-[400px] overflow-auto shadow-lg">
            <CardContent className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {result.sessionTitle || result.sourceName}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {highlightMatch(result.content, query)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {result.matchType === "semantic" && (
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(result.similarity * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Full-width search component
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Transcripts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-10 pr-8"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !loading && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {searched && (
          <div className="text-xs text-muted-foreground">
            {results.length === 0
              ? `No results for "${query}"`
              : `${results.length} result${results.length === 1 ? "" : "s"} found`}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm">
                      {result.sessionTitle || result.sourceName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.matchType === "semantic" && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        AI Match
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(result.similarity * 100)}%
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                  {highlightMatch(result.content, query)}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {result.sessionDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(result.sessionDate), { addSuffix: true })}
                      </span>
                    )}
                    {result.clientName && !clientId && (
                      <Badge variant="outline" className="text-xs">
                        {result.clientName}
                      </Badge>
                    )}
                  </div>

                  {result.sessionId && (
                    <Link href={`/session/${result.sessionId}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        View Session
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
