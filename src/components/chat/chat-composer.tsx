"use client";

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Send,
  Paperclip,
  Sparkles,
  Users,
  FileText,
  X,
  Loader2,
  Command,
  Hash,
  AtSign,
  Image as ImageIcon,
} from "lucide-react";

interface Persona {
  id: string;
  name: string;
  description?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
  type: string;
}

interface Attachment {
  id: string;
  file: File;
  preview?: string;
}

type MentionType = "persona" | "client" | "source" | "command";

interface MentionSuggestion {
  id: string;
  name: string;
  type: MentionType;
  description?: string;
  icon?: React.ReactNode;
}

interface ChatComposerProps {
  onSubmit: (message: string, options: {
    personaId?: string;
    clientId?: string;
    sourceIds?: string[];
    attachments?: File[];
  }) => void;
  personas?: Persona[];
  clients?: Client[];
  sources?: Source[];
  selectedPersona?: string | null;
  selectedClient?: string | null;
  onPersonaChange?: (id: string | null) => void;
  onClientChange?: (id: string | null) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  /** Compact mode hides quick action buttons and shows minimal UI */
  compact?: boolean;
  /** Show/hide attachment button */
  showAttachments?: boolean;
}

const COMMANDS = [
  { id: "clear", name: "clear", description: "Clear conversation history" },
  { id: "help", name: "help", description: "Show available commands" },
  { id: "source", name: "source", description: "Add a source to context" },
  { id: "persona", name: "persona", description: "Switch persona" },
  { id: "client", name: "client", description: "Switch client context" },
];

export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  ({
    onSubmit,
    personas = [],
    clients = [],
    sources = [],
    selectedPersona,
    selectedClient,
    onPersonaChange,
    onClientChange,
    isLoading = false,
    placeholder = "Type a message... Use @ for personas, / for commands",
    className,
    compact = false,
    showAttachments = true,
  }, ref) => {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionType, setSuggestionType] = useState<MentionType | null>(null);
    const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStart, setMentionStart] = useState(-1);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Expose ref
    useEffect(() => {
      if (ref && typeof ref === "function") {
        ref(textareaRef.current);
      } else if (ref) {
        ref.current = textareaRef.current;
      }
    }, [ref]);

    // Build suggestions based on type
    const buildSuggestions = useCallback((type: MentionType, query: string): MentionSuggestion[] => {
      const q = query.toLowerCase();

      switch (type) {
        case "persona":
          return personas
            .filter(p => p.name.toLowerCase().includes(q))
            .map(p => ({
              id: p.id,
              name: p.name,
              type: "persona" as const,
              description: p.description,
              icon: <Sparkles className="h-4 w-4 text-warning" />,
            }));

        case "client":
          return clients
            .filter(c => c.name.toLowerCase().includes(q))
            .map(c => ({
              id: c.id,
              name: c.name,
              type: "client" as const,
              icon: <Users className="h-4 w-4 text-primary" />,
            }));

        case "source":
          return sources
            .filter(s => s.name.toLowerCase().includes(q))
            .slice(0, 10)
            .map(s => ({
              id: s.id,
              name: s.name,
              type: "source" as const,
              description: s.type,
              icon: s.type === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />,
            }));

        case "command":
          return COMMANDS
            .filter(c => c.name.toLowerCase().includes(q))
            .map(c => ({
              id: c.id,
              name: c.name,
              type: "command" as const,
              description: c.description,
              icon: <Command className="h-4 w-4 text-muted-foreground" />,
            }));

        default:
          return [];
      }
    }, [personas, clients, sources]);

    // Parse input for mentions
    const parseInput = useCallback((text: string, cursorPos: number) => {
      // Check if we're in a mention context
      const textBeforeCursor = text.slice(0, cursorPos);

      // @ for personas (or clients with @@)
      const atMatch = textBeforeCursor.match(/@(@?)(\w*)$/);
      if (atMatch) {
        const isClient = atMatch[1] === "@";
        const query = atMatch[2];
        setMentionStart(cursorPos - atMatch[0].length);
        setMentionQuery(query);
        setSuggestionType(isClient ? "client" : "persona");
        setSuggestions(buildSuggestions(isClient ? "client" : "persona", query));
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }

      // / for commands
      const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
      if (slashMatch) {
        const query = slashMatch[1];
        setMentionStart(cursorPos - slashMatch[0].length);
        setMentionQuery(query);
        setSuggestionType("command");
        setSuggestions(buildSuggestions("command", query));
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }

      // # for sources
      const hashMatch = textBeforeCursor.match(/#(\w*)$/);
      if (hashMatch) {
        const query = hashMatch[1];
        setMentionStart(cursorPos - hashMatch[0].length);
        setMentionQuery(query);
        setSuggestionType("source");
        setSuggestions(buildSuggestions("source", query));
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }

      // No mention context
      setShowSuggestions(false);
      setSuggestionType(null);
      setMentionStart(-1);
    }, [buildSuggestions]);

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      parseInput(newValue, e.target.selectionStart || 0);

      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
      }
    };

    // Handle selection
    const selectSuggestion = (suggestion: MentionSuggestion) => {
      if (mentionStart < 0) return;

      // Handle commands specially
      if (suggestion.type === "command") {
        handleCommand(suggestion.id);
        setValue("");
        setShowSuggestions(false);
        return;
      }

      // Replace mention text with the selected item
      const before = value.slice(0, mentionStart);
      const after = value.slice(textareaRef.current?.selectionStart || value.length);

      // Format: @PersonaName or @@ClientName or #SourceName
      const prefix = suggestion.type === "persona" ? "@" : suggestion.type === "client" ? "@@" : "#";
      const mentionText = `${prefix}${suggestion.name.replace(/\s+/g, "-")} `;

      const newValue = before + mentionText + after;
      setValue(newValue);
      setShowSuggestions(false);

      // If it's a persona, also select it
      if (suggestion.type === "persona" && onPersonaChange) {
        onPersonaChange(suggestion.id);
      }

      // If it's a client, also select it
      if (suggestion.type === "client" && onClientChange) {
        onClientChange(suggestion.id);
      }

      // Focus back to input
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPos = before.length + mentionText.length;
        textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    };

    // Handle commands
    const handleCommand = (command: string) => {
      switch (command) {
        case "clear":
          // Emit a clear event - parent handles this
          onSubmit("/clear", {});
          break;
        case "help":
          // Show help
          onSubmit("/help", {});
          break;
        case "persona":
          openSuggestions("persona");
          break;
        case "client":
          openSuggestions("client");
          break;
        case "source":
          openSuggestions("source");
          break;
      }
    };

    // Open suggestions panel directly (for quick action buttons)
    const openSuggestions = (type: MentionType) => {
      setSuggestionType(type);
      setSuggestions(buildSuggestions(type, ""));
      setShowSuggestions(true);
      setSelectedIndex(0);
      setMentionStart(value.length); // Set to end of current value
      textareaRef.current?.focus();
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (showSuggestions && suggestions.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % suggestions.length);
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
            break;
          case "Tab":
          case "Enter":
            if (suggestions[selectedIndex]) {
              e.preventDefault();
              selectSuggestion(suggestions[selectedIndex]);
            }
            break;
          case "Escape":
            e.preventDefault();
            setShowSuggestions(false);
            break;
        }
        return;
      }

      // Submit on Enter (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    // Handle submit
    const handleSubmit = () => {
      if (!value.trim() && attachments.length === 0) return;
      if (isLoading) return;

      // Extract mentions from the message
      const mentionedSourceIds: string[] = [];

      // Find #source mentions
      const sourceMatches = value.matchAll(/#([\w-]+)/g);
      for (const match of sourceMatches) {
        const sourceName = match[1].replace(/-/g, " ").toLowerCase();
        const source = sources.find(s => s.name.toLowerCase().includes(sourceName));
        if (source) {
          mentionedSourceIds.push(source.id);
        }
      }

      // Clean message (optionally remove mentions)
      const cleanMessage = value.trim();

      onSubmit(cleanMessage, {
        personaId: selectedPersona || undefined,
        clientId: selectedClient || undefined,
        sourceIds: mentionedSourceIds.length > 0 ? mentionedSourceIds : undefined,
        attachments: attachments.map(a => a.file),
      });

      setValue("");
      setAttachments([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newAttachments: Attachment[] = files.map(file => ({
        id: `${Date.now()}-${file.name}`,
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    // Remove attachment
    const removeAttachment = (id: string) => {
      setAttachments(prev => {
        const att = prev.find(a => a.id === id);
        if (att?.preview) {
          URL.revokeObjectURL(att.preview);
        }
        return prev.filter(a => a.id !== id);
      });
    };

    // Scroll selected suggestion into view
    useEffect(() => {
      if (showSuggestions && suggestionsRef.current) {
        const selected = suggestionsRef.current.children[selectedIndex] as HTMLElement;
        selected?.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex, showSuggestions]);

    // Cleanup previews on unmount
    useEffect(() => {
      return () => {
        attachments.forEach(a => {
          if (a.preview) URL.revokeObjectURL(a.preview);
        });
      };
    }, []);

    return (
      <div className={cn("relative", className)}>
        {/* Suggestions Popup */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute bottom-full left-0 right-0 mb-2 bg-card border-2 border-border rounded-xl shadow-corporate-lg max-h-64 overflow-y-auto z-50"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                {suggestionType === "persona" && "Personas"}
                {suggestionType === "client" && "Clients"}
                {suggestionType === "source" && "Sources"}
                {suggestionType === "command" && "Commands"}
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                    index === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {suggestion.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{suggestion.name}</div>
                    {suggestion.description && (
                      <div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <span className="text-xs text-muted-foreground">↵</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {attachments.map(att => (
              <div
                key={att.id}
                className="relative flex-shrink-0 group"
              >
                {att.preview ? (
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-16 w-16 object-cover rounded-lg border-2 border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-[10px] px-1 truncate rounded-b-lg">
                  {att.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* File Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          {showAttachments && !compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          )}

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                "w-full resize-none rounded-lg border-2 border-border bg-background px-4 py-2.5 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                compact ? "min-h-[40px] max-h-[120px]" : "min-h-[44px] max-h-[200px]"
              )}
            />
          </div>

          {/* Send Button */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (!value.trim() && attachments.length === 0)}
            size={compact ? "icon" : "default"}
            className={compact ? "h-10 w-10 flex-shrink-0" : "h-10 px-4 flex-shrink-0"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Action Buttons - only show in non-compact mode */}
        {!compact && (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => openSuggestions("persona")}
              disabled={isLoading || personas.length === 0}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <AtSign className="h-3 w-3 text-warning" />
              <span>persona</span>
            </button>
            <button
              type="button"
              onClick={() => openSuggestions("source")}
              disabled={isLoading || sources.length === 0}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Hash className="h-3 w-3 text-primary" />
              <span>source</span>
            </button>
            <button
              type="button"
              onClick={() => openSuggestions("command")}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Command className="h-3 w-3" />
              <span>/cmd</span>
            </button>
            {showAttachments && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Paperclip className="h-3 w-3" />
                <span>attach</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

ChatComposer.displayName = "ChatComposer";
