"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChat, Message } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Rocket,
  Target,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Send,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  MessageSquare,
  X,
  AlertTriangle,
  FileText,
  Clock,
  BarChart3,
  StickyNote,
  Shield,
  Wand2,
  Copy,
  Share2,
  ExternalLink,
  Download,
  Link2,
  Table2,
  MoveRight,
  Layers,
  Settings2,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/components/chat";

interface Client {
  id: string;
  name: string;
  company?: string;
}

interface Source {
  id: string;
  name: string;
  type: string;
}

interface Persona {
  id: string;
  name: string;
  description?: string;
}

interface PlanItem {
  id: string;
  text: string;
  done: boolean;
  children?: PlanItem[];
  order: number;
  assignee?: string;
  dueDate?: string;
  notes?: string;
  priority?: 'now' | 'next' | 'later';
  blockedBy?: string;
}

interface InitiativeMetrics {
  quantitative: string[];
  qualitative: string[];
}

interface PlanSection {  // Now represents an "Initiative"
  id: string;
  title: string;
  
  // Initiative-level planning (optional - fill in when it's a real initiative)
  objective?: string;
  goal?: string;
  successMetrics?: InitiativeMetrics;
  rules?: string[];
  
  // Context
  why?: string;
  what?: string;
  notes?: string;
  
  // Lifecycle
  status?: 'draft' | 'active' | 'completed' | 'backlog';
  
  items: PlanItem[];
  order: number;
  collapsed?: boolean;
}

interface SuccessMetrics {
  quantitative: string[];
  qualitative: string[];
}

interface ExecutionPlan {
  id: string;
  clientId: string;
  title: string;
  objective?: string;
  timeframe?: string;
  startDate?: string;
  targetDate?: string;
  goal?: string;
  successMetrics?: SuccessMetrics;
  sections?: PlanSection[];
  notes?: string;
  rules?: string[];
  status: string;
  client?: Client;
}

export default function ExecutionPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [newRuleText, setNewRuleText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [pendingAdditions, setPendingAdditions] = useState<{
    sections: string[];
    items: { sectionTitle: string; items: string[] }[];
    rules: string[];
    metrics: { type: 'quant' | 'qual'; text: string }[];
  }>({ sections: [], items: [], rules: [], metrics: [] });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat context
  const [sources, setSources] = useState<Source[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat history storage key
  const chatStorageKey = `dtt-chat-${params.id}`;

  // Load persisted chat history
  const getInitialMessages = (): Message[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(chatStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [];
  };

  // AI Chat with clientId for RAG context
  const { messages, append, setMessages, isLoading: chatLoading } = useChat({
    api: "/api/chat",
    body: {
      context: "execution-plan",
      clientId: plan?.clientId, // Pass clientId for RAG context!
      personaId: selectedPersona,
      plan: plan,
    },
    initialMessages: getInitialMessages(),
    onFinish: () => {
      // Persist messages after each response
      if (typeof window !== "undefined") {
        localStorage.setItem(chatStorageKey, JSON.stringify(messages));
      }
    },
  });

  // Persist messages when they change
  useEffect(() => {
    if (messages.length > 0 && typeof window !== "undefined") {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [messages, chatStorageKey]);

  // Load plan data
  useEffect(() => {
    fetch(`/api/execution-plans/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPlan(data);
        // Expand all sections by default
        if (data.sections) {
          setExpandedSections(new Set(data.sections.map((s: PlanSection) => s.id)));
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Load sources when plan loads (for #source mentions)
  useEffect(() => {
    if (!plan?.clientId) return;
    
    fetch(`/api/clients/${plan.clientId}/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch((e) => console.error("Failed to fetch sources:", e));
  }, [plan?.clientId]);

  // Load personas
  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then(setPersonas)
      .catch((e) => console.error("Failed to fetch personas:", e));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle chat message submission from ChatComposer
  const handleChatSubmit = useCallback(async (
    message: string,
    options: {
      personaId?: string;
      sourceIds?: string[];
      attachments?: File[];
    }
  ) => {
    // Handle commands
    if (message === "/clear") {
      setMessages([]);
      localStorage.removeItem(chatStorageKey);
      return;
    }
    if (message === "/help") {
      append({
        role: "assistant",
        content: `**Available commands:**
- \`/clear\` - Clear conversation history
- \`@persona\` - Use a specific AI persona
- \`#source\` - Reference a client source/document
- Attach files to include them in context

**Tips:**
- Ask me to break down complex tasks
- Use \`#\` to reference specific documents for context
- Ask about risks or missing steps
- Say "add section X" or "add item Y to section Z" to suggest plan changes`,
      });
      return;
    }

    // Update selected persona if changed
    if (options.personaId && options.personaId !== selectedPersona) {
      setSelectedPersona(options.personaId);
    }

    // Build enhanced message with source content
    let enhancedMessage = message;
    
    // Include referenced sources content
    if (options.sourceIds && options.sourceIds.length > 0) {
      const sourceContents: string[] = [];
      for (const sourceId of options.sourceIds) {
        const source = sources.find(s => s.id === sourceId);
        if (source) {
          try {
            const res = await fetch(`/api/sources/${sourceId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                sourceContents.push(`\n\n--- Content from "${source.name}" ---\n${data.content.slice(0, 5000)}`);
              }
            }
          } catch (e) {
            console.error("Failed to fetch source content:", e);
          }
        }
      }
      if (sourceContents.length > 0) {
        enhancedMessage = message + sourceContents.join("\n");
      }
    }

    // Handle file attachments - upload and extract content
    if (options.attachments && options.attachments.length > 0) {
      for (const file of options.attachments) {
        try {
          // Upload the file
          const formData = new FormData();
          formData.append("file", file);
          formData.append("clientId", plan?.clientId || "");
          
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.content) {
              enhancedMessage += `\n\n--- Content from attached "${file.name}" ---\n${uploadData.content.slice(0, 5000)}`;
            } else if (file.type.startsWith("image/")) {
              enhancedMessage += `\n\n[Attached image: ${file.name} - uploaded to sources for vision analysis]`;
            }
          }
        } catch (e) {
          console.error("Failed to upload attachment:", e);
        }
      }
    }

    // Append message
    append({
      role: "user",
      content: enhancedMessage,
    });
  }, [append, setMessages, selectedPersona, chatStorageKey, sources, plan?.clientId]);

  // Quick add functions for AI suggestions
  const quickAddSection = (title: string) => {
    const sections = plan?.sections || [];
    const newSection: PlanSection = {
      id: crypto.randomUUID(),
      title,
      items: [],
      order: sections.length,
    };
    updatePlan({ sections: [...sections, newSection] });
    setExpandedSections((prev) => new Set([...Array.from(prev), newSection.id]));
  };

  const quickAddItem = (sectionId: string, text: string) => {
    const sections = plan?.sections?.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: [
            ...s.items,
            { id: crypto.randomUUID(), text, done: false, order: s.items.length },
          ],
        };
      }
      return s;
    });
    updatePlan({ sections });
  };

  const quickAddRule = (text: string) => {
    const rules = [...(plan?.rules || []), text];
    updatePlan({ rules });
  };

  const quickAddMetric = (type: 'quantitative' | 'qualitative', text: string) => {
    const metrics = {
      quantitative: type === 'quantitative' 
        ? [...(plan?.successMetrics?.quantitative || []), text]
        : (plan?.successMetrics?.quantitative || []),
      qualitative: type === 'qualitative'
        ? [...(plan?.successMetrics?.qualitative || []), text]
        : (plan?.successMetrics?.qualitative || []),
    };
    updatePlan({ successMetrics: metrics });
  };

  // Auto-save with debounce
  const autoSave = useCallback((updates: Partial<ExecutionPlan>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/execution-plans/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        console.error("Auto-save failed:", e);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [params.id]);

  const updatePlan = (updates: Partial<ExecutionPlan>) => {
    setPlan((prev) => prev ? { ...prev, ...updates } : prev);
    autoSave(updates);
  };

  // Apply AI suggestion to plan (for future auto-apply feature)
  const applyAISuggestion = useCallback((suggestion: {
    type: "addSection" | "addItem" | "updateItem";
    sectionTitle?: string;
    sectionId?: string;
    itemText?: string;
    itemId?: string;
    updates?: Partial<PlanItem>;
  }) => {
    if (!plan) return;
    
    if (suggestion.type === "addSection" && suggestion.sectionTitle) {
      const sections = plan.sections || [];
      const newSection: PlanSection = {
        id: crypto.randomUUID(),
        title: suggestion.sectionTitle,
        items: [],
        order: sections.length,
      };
      updatePlan({ sections: [...sections, newSection] });
      setExpandedSections((prev) => new Set([...Array.from(prev), newSection.id]));
    }
    
    if (suggestion.type === "addItem" && suggestion.sectionId && suggestion.itemText) {
      const sections = plan.sections?.map((s) => {
        if (s.id === suggestion.sectionId) {
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: crypto.randomUUID(),
                text: suggestion.itemText!,
                done: false,
                order: s.items.length,
              },
            ],
          };
        }
        return s;
      });
      updatePlan({ sections });
    }
  }, [plan]);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/execution-plans/${params.id}/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Generation failed");
      const { plan: updatedPlan } = await res.json();
      setPlan(updatedPlan);
      if (updatedPlan.sections) {
        setExpandedSections(new Set(updatedPlan.sections.map((s: PlanSection) => s.id)));
      }
    } catch (e) {
      console.error("Failed to generate plan:", e);
    } finally {
      setGenerating(false);
    }
  };

  // Initiative (section) management
  const addInitiative = (status: 'draft' | 'active' | 'backlog' = 'draft') => {
    const sections = plan?.sections || [];
    const newSection: PlanSection = {
      id: crypto.randomUUID(),
      title: "New Initiative",
      status,
      items: [],
      order: sections.length,
    };
    updatePlan({ sections: [...sections, newSection] });
    setExpandedSections((prev) => new Set([...Array.from(prev), newSection.id]));
  };

  // Legacy alias
  const addSection = () => addInitiative('draft');

  const updateSection = (sectionId: string, updates: Partial<PlanSection>) => {
    const sections = plan?.sections?.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    updatePlan({ sections });
  };

  const deleteSection = (sectionId: string) => {
    const sections = plan?.sections?.filter((s) => s.id !== sectionId);
    updatePlan({ sections });
  };

  // Move item between initiatives
  const moveItemToInitiative = (fromSectionId: string, itemId: string, toSectionId: string) => {
    if (!plan?.sections) return;
    
    let movedItem: PlanItem | null = null;
    
    // Remove from source
    const sectionsWithoutItem = plan.sections.map((s) => {
      if (s.id === fromSectionId) {
        const item = s.items.find(i => i.id === itemId);
        if (item) movedItem = item;
        return { ...s, items: s.items.filter(i => i.id !== itemId) };
      }
      return s;
    });
    
    if (!movedItem) return;
    
    // Add to destination
    const sections = sectionsWithoutItem.map((s) => {
      if (s.id === toSectionId) {
        return { ...s, items: [...s.items, { ...movedItem!, order: s.items.length }] };
      }
      return s;
    });
    
    updatePlan({ sections });
  };

  // Promote item to its own initiative
  const promoteToInitiative = (sectionId: string, itemId: string) => {
    if (!plan?.sections) return;
    
    const section = plan.sections.find(s => s.id === sectionId);
    const item = section?.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Create new initiative with item text as objective
    const newInitiative: PlanSection = {
      id: crypto.randomUUID(),
      title: item.text || "New Initiative",
      objective: item.text,
      status: 'draft',
      items: [],
      order: plan.sections.length,
    };
    
    // Remove item from source, add new initiative
    const sections = plan.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, items: s.items.filter(i => i.id !== itemId) };
      }
      return s;
    });
    
    updatePlan({ sections: [...sections, newInitiative] });
    setExpandedSections((prev) => new Set([...Array.from(prev), newInitiative.id]));
  };

  // Reorder items within a section
  const reorderItem = (sectionId: string, itemId: string, direction: 'up' | 'down') => {
    if (!plan?.sections) return;
    
    const sections = plan.sections.map((s) => {
      if (s.id !== sectionId) return s;
      
      const idx = s.items.findIndex(i => i.id === itemId);
      if (idx === -1) return s;
      if (direction === 'up' && idx === 0) return s;
      if (direction === 'down' && idx === s.items.length - 1) return s;
      
      const newItems = [...s.items];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
      
      // Update order values
      newItems.forEach((item, i) => {
        item.order = i;
      });
      
      return { ...s, items: newItems };
    });
    
    updatePlan({ sections });
  };

  // Get sections grouped by status
  const groupedSections = {
    active: plan?.sections?.filter(s => s.status === 'active') || [],
    draft: plan?.sections?.filter(s => s.status === 'draft' || !s.status) || [],
    backlog: plan?.sections?.filter(s => s.status === 'backlog') || [],
    completed: plan?.sections?.filter(s => s.status === 'completed') || [],
  };

  // Item management
  const addItem = (sectionId: string, parentId?: string) => {
    const sections = plan?.sections?.map((section) => {
      if (section.id !== sectionId) return section;

      if (parentId) {
        // Add as child
        const updateItems = (items: PlanItem[]): PlanItem[] =>
          items.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                children: [
                  ...(item.children || []),
                  {
                    id: crypto.randomUUID(),
                    text: "",
                    done: false,
                    order: (item.children?.length || 0),
                  },
                ],
              };
            }
            if (item.children) {
              return { ...item, children: updateItems(item.children) };
            }
            return item;
          });
        return { ...section, items: updateItems(section.items) };
      }

      // Add to section
      return {
        ...section,
        items: [
          ...section.items,
          {
            id: crypto.randomUUID(),
            text: "",
            done: false,
            order: section.items.length,
          },
        ],
      };
    });
    updatePlan({ sections });
  };

  const updateItem = (
    sectionId: string,
    itemId: string,
    updates: Partial<PlanItem>
  ) => {
    const sections = plan?.sections?.map((section) => {
      if (section.id !== sectionId) return section;

      const updateItems = (items: PlanItem[]): PlanItem[] =>
        items.map((item) => {
          if (item.id === itemId) {
            return { ...item, ...updates };
          }
          if (item.children) {
            return { ...item, children: updateItems(item.children) };
          }
          return item;
        });

      return { ...section, items: updateItems(section.items) };
    });
    updatePlan({ sections });
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    const sections = plan?.sections?.map((section) => {
      if (section.id !== sectionId) return section;

      const filterItems = (items: PlanItem[]): PlanItem[] =>
        items
          .filter((item) => item.id !== itemId)
          .map((item) => ({
            ...item,
            children: item.children ? filterItems(item.children) : undefined,
          }));

      return { ...section, items: filterItems(section.items) };
    });
    updatePlan({ sections });
  };

  // Rules management
  const addRule = () => {
    if (!newRuleText.trim()) return;
    const rules = [...(plan?.rules || []), newRuleText.trim()];
    updatePlan({ rules });
    setNewRuleText("");
  };

  const deleteRule = (index: number) => {
    const rules = plan?.rules?.filter((_, i) => i !== index);
    updatePlan({ rules });
  };

  // Progress calculation
  const getProgress = () => {
    if (!plan?.sections) return { done: 0, total: 0 };
    let done = 0, total = 0;
    
    const countItems = (items: PlanItem[]) => {
      items.forEach((item) => {
        total++;
        if (item.done) done++;
        if (item.children) countItems(item.children);
      });
    };
    
    plan.sections.forEach((s) => countItems(s.items));
    return { done, total };
  };

  const progress = getProgress();
  const progressPercent = progress.total > 0 
    ? Math.round((progress.done / progress.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Plan not found</p>
        <Link href="/methods/do-the-thing">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/methods/do-the-thing">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{plan.title}</h1>
                <Badge variant="outline" className={cn(
                  plan.status === "active" && "bg-green-500/20 text-green-500",
                  plan.status === "completed" && "bg-blue-500/20 text-blue-500",
                  plan.status === "draft" && "bg-yellow-500/20 text-yellow-500"
                )}>
                  {plan.status}
                </Badge>
                {saving && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </Badge>
                )}
              </div>
              {plan.client && (
                <p className="text-muted-foreground">
                  {plan.client.name}
                  {plan.client.company && ` · ${plan.client.company}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className={cn(showChat && "bg-primary/10")}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Asst.
            </Button>

            {/* Share Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    // Open in new window without nav for screen sharing
                    const url = `/share/plan/${params.id}`;
                    window.open(
                      url,
                      'plan-share',
                      'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no'
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Window
                  <span className="ml-auto text-xs text-muted-foreground">Screen share</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    // PDF export - trigger print dialog
                    const url = `/share/plan/${params.id}?print=true`;
                    const printWindow = window.open(url, '_blank');
                    if (printWindow) {
                      printWindow.onload = () => {
                        setTimeout(() => printWindow.print(), 500);
                      };
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save as PDF
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={async () => {
                    // Copy shareable link
                    const url = `${window.location.origin}/share/plan/${params.id}`;
                    await navigator.clipboard.writeText(url);
                    // TODO: Show toast notification
                  }}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem disabled>
                  <Table2 className="h-4 w-4 mr-2" />
                  Export to Google Sheets
                  <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={generatePlan}
              disabled={generating}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {progress.done} of {progress.total} items ({progressPercent}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Core Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Plan Overview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingHeader(!editingHeader)}
              >
                {editingHeader ? "Done" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {editingHeader ? (
              <>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea
                    value={plan.objective || ""}
                    onChange={(e) => updatePlan({ objective: e.target.value })}
                    placeholder="What are we doing?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Textarea
                    value={plan.goal || ""}
                    onChange={(e) => updatePlan({ goal: e.target.value })}
                    placeholder="What does success look like?"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select
                    value={plan.timeframe || ""}
                    onValueChange={(v) => updatePlan({ timeframe: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2 weeks">2 weeks</SelectItem>
                      <SelectItem value="30 days">30 days</SelectItem>
                      <SelectItem value="90 days">90 days</SelectItem>
                      <SelectItem value="6 months">6 months</SelectItem>
                      <SelectItem value="12 months">12 months</SelectItem>
                      <SelectItem value="Phase 1">Phase 1</SelectItem>
                      <SelectItem value="Ongoing">Ongoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={plan.status}
                    onValueChange={(v) => updatePlan({ status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
                  <p className="text-sm">{plan.objective || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Goal</p>
                  <p className="text-sm">{plan.goal || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Timeframe</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {plan.timeframe || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <p className="text-sm">{plan.status}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              How Do We Know It Works?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quantitative</Label>
              <div className="space-y-1">
                {plan.successMetrics?.quantitative?.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>{metric}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto opacity-0 hover:opacity-100"
                      onClick={() => {
                        const metrics = {
                          ...plan.successMetrics,
                          quantitative: plan.successMetrics?.quantitative?.filter((_, idx) => idx !== i) || [],
                        };
                        updatePlan({ successMetrics: metrics as SuccessMetrics });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Input
                  placeholder="Add quantitative metric..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      const metrics = {
                        quantitative: [...(plan.successMetrics?.quantitative || []), e.currentTarget.value],
                        qualitative: plan.successMetrics?.qualitative || [],
                      };
                      updatePlan({ successMetrics: metrics });
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Qualitative</Label>
              <div className="space-y-1">
                {plan.successMetrics?.qualitative?.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    <span>{metric}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto opacity-0 hover:opacity-100"
                      onClick={() => {
                        const metrics = {
                          ...plan.successMetrics,
                          qualitative: plan.successMetrics?.qualitative?.filter((_, idx) => idx !== i) || [],
                        };
                        updatePlan({ successMetrics: metrics as SuccessMetrics });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Input
                  placeholder="Add qualitative metric..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      const metrics = {
                        quantitative: plan.successMetrics?.quantitative || [],
                        qualitative: [...(plan.successMetrics?.qualitative || []), e.currentTarget.value],
                      };
                      updatePlan({ successMetrics: metrics });
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Initiatives / The Plan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-500" />
              Initiatives
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addInitiative('draft')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Initiative
              </Button>
              {!plan.sections?.length && (
                <Button 
                  size="sm" 
                  onClick={generatePlan}
                  disabled={generating}
                  className="bg-gradient-to-r from-orange-500 to-red-600"
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              )}
            </div>
          </div>

          {(!plan.sections || plan.sections.length === 0) && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm mb-3">
                  No initiatives yet. Add one or generate with AI.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addInitiative('active')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Initiative
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={generatePlan}
                    disabled={generating}
                    className="bg-gradient-to-r from-orange-500 to-red-600"
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Generate Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Initiatives */}
          {groupedSections.active.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Active
              </div>
              {groupedSections.active.map((section) => (
                <InitiativeCard 
                  key={section.id} 
                  section={section}
                  allSections={plan?.sections || []}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => {
                    setExpandedSections((prev) => {
                      const next = new Set(prev);
                      next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                      return next;
                    });
                  }}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onAddItem={() => addItem(section.id)}
                  onUpdateItem={updateItem}
                  onDeleteItem={deleteItem}
                  onAddChildItem={addItem}
                  onMoveItem={moveItemToInitiative}
                  onPromoteItem={promoteToInitiative}
                  onReorderItem={reorderItem}
                />
              ))}
            </div>
          )}

          {/* Draft Initiatives */}
          {groupedSections.draft.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-500">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                Draft
              </div>
              {groupedSections.draft.map((section) => (
                <InitiativeCard 
                  key={section.id} 
                  section={section}
                  allSections={plan?.sections || []}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => {
                    setExpandedSections((prev) => {
                      const next = new Set(prev);
                      next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                      return next;
                    });
                  }}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onAddItem={() => addItem(section.id)}
                  onUpdateItem={updateItem}
                  onDeleteItem={deleteItem}
                  onAddChildItem={addItem}
                  onMoveItem={moveItemToInitiative}
                  onPromoteItem={promoteToInitiative}
                  onReorderItem={reorderItem}
                />
              ))}
            </div>
          )}

          {/* Backlog */}
          {groupedSections.backlog.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                Backlog
              </div>
              {groupedSections.backlog.map((section) => (
                <InitiativeCard 
                  key={section.id} 
                  section={section}
                  allSections={plan?.sections || []}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => {
                    setExpandedSections((prev) => {
                      const next = new Set(prev);
                      next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                      return next;
                    });
                  }}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onAddItem={() => addItem(section.id)}
                  onUpdateItem={updateItem}
                  onDeleteItem={deleteItem}
                  onAddChildItem={addItem}
                  onMoveItem={moveItemToInitiative}
                  onPromoteItem={promoteToInitiative}
                  onReorderItem={reorderItem}
                />
              ))}
            </div>
          )}

          {/* Completed - collapsed by default */}
          {groupedSections.completed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
                <CheckCircle2 className="h-3 w-3" />
                Completed ({groupedSections.completed.length})
              </div>
              {groupedSections.completed.map((section) => (
                <InitiativeCard 
                  key={section.id} 
                  section={section}
                  allSections={plan?.sections || []}
                  expanded={expandedSections.has(section.id)}
                  onToggle={() => {
                    setExpandedSections((prev) => {
                      const next = new Set(prev);
                      next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                      return next;
                    });
                  }}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onAddItem={() => addItem(section.id)}
                  onUpdateItem={updateItem}
                  onDeleteItem={deleteItem}
                  onAddChildItem={addItem}
                  onMoveItem={moveItemToInitiative}
                  onPromoteItem={promoteToInitiative}
                  onReorderItem={reorderItem}
                  isCompleted
                />
              ))}
            </div>
          )}

          {/* Quick add buttons for empty groups */}
          {plan.sections && plan.sections.length > 0 && groupedSections.backlog.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => addInitiative('backlog')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Backlog
            </Button>
          )}
        </div>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-yellow-500" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={plan.notes || ""}
              onChange={(e) => updatePlan({ notes: e.target.value })}
              placeholder="Extra bits, tools needed, lists, things to remember..."
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Rules & Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.rules?.map((rule, i) => (
              <div 
                key={i} 
                className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm flex-1">{rule}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => deleteRule(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Add a rule or constraint..."
                onKeyDown={(e) => e.key === "Enter" && addRule()}
              />
              <Button variant="outline" onClick={addRule}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Sidebar */}
      {showChat && (
        <div className="w-96 border-l bg-muted/30 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              AI Assistant
            </h3>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setMessages([]);
                    localStorage.removeItem(chatStorageKey);
                  }}
                >
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Ask me anything about this plan.</p>
                <p className="mt-2">I can help you:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Break down complex tasks</li>
                  <li>• Suggest missing steps</li>
                  <li>• Identify risks</li>
                  <li>• Refine your metrics</li>
                </ul>
                <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-left">
                  <p className="font-medium mb-1">💡 Tips:</p>
                  <p>• Use <code className="bg-background px-1 rounded">#</code> to reference client sources</p>
                  <p>• Use <code className="bg-background px-1 rounded">@</code> to select a persona</p>
                  <p>• Attach files for context</p>
                </div>
              </div>
            )}
            {messages.map((m) => {
              // Parse AI response for actionable suggestions
              const suggestions: { type: string; content: string; sectionId?: string }[] = [];
              
              if (m.role === "assistant") {
                // Look for ADD SECTION patterns
                const sectionMatches = Array.from(m.content.matchAll(/📂\s*ADD SECTION:\s*["']?([^"'\n]+)["']?/gi));
                for (const match of sectionMatches) {
                  suggestions.push({ type: "section", content: match[1].trim() });
                }
                
                // Look for ADD TO [section] patterns
                const itemMatches = Array.from(m.content.matchAll(/➕\s*ADD TO\s*[\[(]?([^\]:\n]+)[\])]?:\s*\n?((?:[-•*]\s*.+\n?)+)/gi));
                for (const match of itemMatches) {
                  const sectionTitle = match[1].trim();
                  const items = match[2].split('\n')
                    .map(line => line.replace(/^[-•*]\s*/, '').trim())
                    .filter(line => line.length > 0);
                  const section = plan?.sections?.find(s => 
                    s.title.toLowerCase().includes(sectionTitle.toLowerCase())
                  );
                  if (section) {
                    items.forEach(item => {
                      suggestions.push({ type: "item", content: item, sectionId: section.id });
                    });
                  }
                }

                // Look for RULE patterns
                const ruleMatches = Array.from(m.content.matchAll(/🛡️?\s*RULE:\s*["']?([^"'\n]+)["']?/gi));
                for (const match of ruleMatches) {
                  suggestions.push({ type: "rule", content: match[1].trim() });
                }
              }

              return (
                <div key={m.id} className="space-y-2">
                  <div
                    className={cn(
                      "rounded-lg p-3 text-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    )}
                  >
                    {m.content}
                  </div>
                  
                  {/* Quick-add buttons for AI suggestions */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-4">
                      {suggestions.slice(0, 5).map((suggestion, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
                          onClick={() => {
                            if (suggestion.type === "section") {
                              quickAddSection(suggestion.content);
                            } else if (suggestion.type === "item" && suggestion.sectionId) {
                              quickAddItem(suggestion.sectionId, suggestion.content);
                            } else if (suggestion.type === "rule") {
                              quickAddRule(suggestion.content);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Add {suggestion.type === "section" ? "Section" : suggestion.type === "rule" ? "Rule" : "Item"}
                        </Button>
                      ))}
                      {suggestions.length > 5 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{suggestions.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {chatLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t">
            <ChatComposer
              onSubmit={handleChatSubmit}
              personas={personas}
              sources={sources}
              selectedPersona={selectedPersona}
              onPersonaChange={setSelectedPersona}
              isLoading={chatLoading}
              placeholder="Ask about this plan... Use @ # or attach files"
              compact={false}
              showAttachments={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Initiative card component
function InitiativeCard({
  section,
  allSections,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddChildItem,
  onMoveItem,
  onPromoteItem,
  onReorderItem,
  isCompleted = false,
}: {
  section: PlanSection;
  allSections: PlanSection[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PlanSection>) => void;
  onDelete: () => void;
  onAddItem: () => void;
  onUpdateItem: (sectionId: string, itemId: string, updates: Partial<PlanItem>) => void;
  onDeleteItem: (sectionId: string, itemId: string) => void;
  onAddChildItem: (sectionId: string, parentId: string) => void;
  onMoveItem: (fromSectionId: string, itemId: string, toSectionId: string) => void;
  onPromoteItem: (sectionId: string, itemId: string) => void;
  onReorderItem: (sectionId: string, itemId: string, direction: 'up' | 'down') => void;
  isCompleted?: boolean;
}) {
  const [showMetadata, setShowMetadata] = useState(false);
  const completedCount = section.items.filter(i => i.done).length;
  const progress = section.items.length > 0 ? (completedCount / section.items.length) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden", isCompleted && "opacity-60")}>
      <CardHeader className={cn(
        "py-3",
        section.status === "active" && "bg-green-500/5 border-l-2 border-l-green-500",
        section.status === "draft" && "bg-yellow-500/5 border-l-2 border-l-yellow-500",
        section.status === "backlog" && "bg-muted/30",
        section.status === "completed" && "bg-blue-500/5 border-l-2 border-l-blue-500"
      )}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="font-semibold border-0 bg-transparent focus-visible:ring-0 p-0 h-auto flex-1"
          />
          
          {/* Status selector */}
          <Select
            value={section.status || 'draft'}
            onValueChange={(value: 'draft' | 'active' | 'completed' | 'backlog') => onUpdate({ status: value })}
          >
            <SelectTrigger className="w-[110px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">🟢 Active</SelectItem>
              <SelectItem value="draft">⚪ Draft</SelectItem>
              <SelectItem value="backlog">📦 Backlog</SelectItem>
              <SelectItem value="completed">✓ Completed</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-xs">
            {completedCount}/{section.items.length}
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowMetadata(!showMetadata)}
            title="Edit initiative details"
          >
            <Settings2 className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Progress bar */}
        {section.items.length > 0 && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Quick info - objective preview */}
        {section.objective && !expanded && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {section.objective}
          </p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-3 space-y-3">
          {/* Metadata editor */}
          {showMetadata && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Objective</Label>
                  <Textarea
                    value={section.objective || ""}
                    onChange={(e) => onUpdate({ objective: e.target.value })}
                    placeholder="What is this initiative trying to achieve?"
                    className="text-sm min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Goal (Definition of Done)</Label>
                  <Textarea
                    value={section.goal || ""}
                    onChange={(e) => onUpdate({ goal: e.target.value })}
                    placeholder="What does success look like?"
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-orange-500">Why</Label>
                  <Textarea
                    value={section.why || ""}
                    onChange={(e) => onUpdate({ why: e.target.value })}
                    placeholder="Why are we doing this?"
                    className="text-sm min-h-[50px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500">What (Success Criteria)</Label>
                  <Textarea
                    value={section.what || ""}
                    onChange={(e) => onUpdate({ what: e.target.value })}
                    placeholder="How do we know it worked?"
                    className="text-sm min-h-[50px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-yellow-500">Notes</Label>
                  <Textarea
                    value={section.notes || ""}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    placeholder="Extra context..."
                    className="text-sm min-h-[50px]"
                  />
                </div>
              </div>

              {/* Success Metrics */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Quantitative Metrics</Label>
                  <div className="space-y-1">
                    {section.successMetrics?.quantitative?.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">{metric}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            const metrics = {
                              ...section.successMetrics,
                              quantitative: section.successMetrics?.quantitative?.filter((_, idx) => idx !== i) || [],
                              qualitative: section.successMetrics?.qualitative || [],
                            };
                            onUpdate({ successMetrics: metrics });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Input
                      placeholder="Add metric (press Enter)..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          const metrics = {
                            quantitative: [...(section.successMetrics?.quantitative || []), e.currentTarget.value],
                            qualitative: section.successMetrics?.qualitative || [],
                          };
                          onUpdate({ successMetrics: metrics });
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Qualitative Metrics</Label>
                  <div className="space-y-1">
                    {section.successMetrics?.qualitative?.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">{metric}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            const metrics = {
                              quantitative: section.successMetrics?.quantitative || [],
                              qualitative: section.successMetrics?.qualitative?.filter((_, idx) => idx !== i) || [],
                            };
                            onUpdate({ successMetrics: metrics });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Input
                      placeholder="Add metric (press Enter)..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          const metrics = {
                            quantitative: section.successMetrics?.quantitative || [],
                            qualitative: [...(section.successMetrics?.qualitative || []), e.currentTarget.value],
                          };
                          onUpdate({ successMetrics: metrics });
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="space-y-2">
                <Label className="text-xs">Rules / Constraints</Label>
                <div className="space-y-1">
                  {section.rules?.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Shield className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="flex-1">{rule}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          onUpdate({ rules: section.rules?.filter((_, idx) => idx !== i) });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Input
                    placeholder="Add rule (press Enter)..."
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        onUpdate({ rules: [...(section.rules || []), e.currentTarget.value] });
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick context display when metadata editor is closed */}
          {!showMetadata && (section.objective || section.why || section.what) && (
            <div className="grid gap-2 text-sm p-3 bg-muted/50 rounded-lg">
              {section.objective && (
                <div>
                  <span className="font-medium text-primary">Objective: </span>
                  <span className="text-muted-foreground">{section.objective}</span>
                </div>
              )}
              {section.why && (
                <div>
                  <span className="font-medium text-orange-500">Why: </span>
                  <span className="text-muted-foreground">{section.why}</span>
                </div>
              )}
              {section.what && (
                <div>
                  <span className="font-medium text-green-500">Success: </span>
                  <span className="text-muted-foreground">{section.what}</span>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="space-y-1">
            {section.items.map((item, idx) => (
              <EnhancedPlanItemRow
                key={item.id}
                item={item}
                itemIndex={idx}
                totalItems={section.items.length}
                sectionId={section.id}
                allSections={allSections}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
                onAddChild={onAddChildItem}
                onMove={onMoveItem}
                onPromote={onPromoteItem}
                onReorder={onReorderItem}
                depth={0}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
            onClick={onAddItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add item
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// Enhanced item component with move/promote/reorder
function EnhancedPlanItemRow({
  item,
  itemIndex,
  totalItems,
  sectionId,
  allSections,
  onUpdate,
  onDelete,
  onAddChild,
  onMove,
  onPromote,
  onReorder,
  depth,
}: {
  item: PlanItem;
  itemIndex: number;
  totalItems: number;
  sectionId: string;
  allSections: PlanSection[];
  onUpdate: (sectionId: string, itemId: string, updates: Partial<PlanItem>) => void;
  onDelete: (sectionId: string, itemId: string) => void;
  onAddChild: (sectionId: string, parentId: string) => void;
  onMove: (fromSectionId: string, itemId: string, toSectionId: string) => void;
  onPromote: (sectionId: string, itemId: string) => void;
  onReorder: (sectionId: string, itemId: string, direction: 'up' | 'down') => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const otherSections = allSections.filter(s => s.id !== sectionId);

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 group py-1">
        {/* Reorder buttons */}
        <div className="flex flex-col opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onReorder(sectionId, item.id, 'up')}
            disabled={itemIndex === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onReorder(sectionId, item.id, 'down')}
            disabled={itemIndex === totalItems - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        <Checkbox
          checked={item.done}
          onCheckedChange={(checked) =>
            onUpdate(sectionId, item.id, { done: !!checked })
          }
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => onUpdate(sectionId, item.id, { text: e.target.value })}
              className={cn(
                "flex-1 border-0 bg-transparent focus-visible:ring-0 p-0 h-auto text-sm",
                item.done && "line-through text-muted-foreground"
              )}
              placeholder="Action item..."
            />
            {item.priority && (
              <Badge variant="outline" className={cn(
                "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                item.priority === "now" && "bg-red-500/20 text-red-500 border-red-500/30",
                item.priority === "next" && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                item.priority === "later" && "bg-muted text-muted-foreground"
              )}>
                {item.priority}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground ml-0 mt-0.5 italic">
              💡 {item.notes}
            </p>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
          {/* Move to initiative */}
          {otherSections.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                title="Move to another initiative"
              >
                <MoveRight className="h-3 w-3" />
              </Button>
              {showMoveMenu && (
                <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-50 min-w-[180px]">
                  <div className="p-1">
                    <p className="text-xs text-muted-foreground px-2 py-1">Move to:</p>
                    {otherSections.map((s) => (
                      <button
                        key={s.id}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                        onClick={() => {
                          onMove(sectionId, item.id, s.id);
                          setShowMoveMenu(false);
                        }}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Promote to initiative */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onPromote(sectionId, item.id)}
            title="Promote to its own initiative"
          >
            <Layers className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddChild(sectionId, item.id)}
            title="Add sub-item"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(sectionId, item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {item.children!.map((child, idx) => (
            <EnhancedPlanItemRow
              key={child.id}
              item={child}
              itemIndex={idx}
              totalItems={item.children!.length}
              sectionId={sectionId}
              allSections={allSections}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onMove={onMove}
              onPromote={onPromote}
              onReorder={onReorder}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Recursive item component (legacy - kept for compatibility)
function PlanItemRow({
  item,
  sectionId,
  onUpdate,
  onDelete,
  onAddChild,
  depth,
}: {
  item: PlanItem;
  sectionId: string;
  onUpdate: (sectionId: string, itemId: string, updates: Partial<PlanItem>) => void;
  onDelete: (sectionId: string, itemId: string) => void;
  onAddChild: (sectionId: string, parentId: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center gap-2 group py-1">
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        <Checkbox
          checked={item.done}
          onCheckedChange={(checked) =>
            onUpdate(sectionId, item.id, { done: !!checked })
          }
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => onUpdate(sectionId, item.id, { text: e.target.value })}
              className={cn(
                "flex-1 border-0 bg-transparent focus-visible:ring-0 p-0 h-auto text-sm",
                item.done && "line-through text-muted-foreground"
              )}
              placeholder="Action item..."
            />
            {item.priority && (
              <Badge variant="outline" className={cn(
                "text-[10px] px-1.5 py-0 h-4 flex-shrink-0",
                item.priority === "now" && "bg-red-500/20 text-red-500 border-red-500/30",
                item.priority === "next" && "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
                item.priority === "later" && "bg-muted text-muted-foreground"
              )}>
                {item.priority}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground ml-0 mt-0.5 italic">
              💡 {item.notes}
            </p>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddChild(sectionId, item.id)}
            title="Add sub-item"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(sectionId, item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <PlanItemRow
              key={child.id}
              item={child}
              sectionId={sectionId}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
