"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Mic,
  Brain,
  Target,
  CheckCircle,
  FileText,
  Users,
  ArrowRight,
  Play,
  Star,
  MessageSquare,
  Zap,
  Shield,
  TrendingUp,
  BarChart3,
  Rocket,
  Building2,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="default" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <SignedOut>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              Built For Solo Consultants Who Do The Work
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
              Your AI-Powered{" "}
              <span className="text-primary">Operating System</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Run a high-performance practice without a team. AI captures every commitment,
              surfaces context during calls, and helps you deliver 10x the value—
              built for coaches and consultants who are operational, not managerial.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </SignedIn>
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none h-40 bottom-0 top-auto" />
            <div className="rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-medium">
                  Live Session — Strategic Advisory Call
                </span>
              </div>
              <div className="p-8 bg-gradient-to-br from-card to-muted/10">
                <div className="grid grid-cols-3 gap-8">
                  {/* Transcript */}
                  <div className="col-span-2 space-y-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Live Transcript
                      <span className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-4 text-sm">
                      <div className="flex gap-3 items-start">
                        <span className="text-accent font-semibold min-w-[60px]">Client:</span>
                        <span className="text-muted-foreground leading-relaxed">
                          We need to accelerate our go-to-market timeline by Q2...
                        </span>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="text-success font-semibold min-w-[60px]">You:</span>
                        <span className="text-muted-foreground leading-relaxed">
                          Based on your current pipeline velocity, I recommend...
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Suggestions */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Brain className="h-4 w-4 text-warning" />
                      AI Insights
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-xs font-medium text-foreground">
                        Discuss resource allocation for Phase 2
                      </div>
                      <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-xs font-medium text-foreground">
                        Action: Send proposal draft by Friday
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                500+ coaches & consultants
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-warning text-warning"
                />
              ))}
              <span className="text-sm font-medium text-muted-foreground ml-2">
                4.9/5 rating
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">$2.5M+</span> in client
              value delivered
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
              Everything a Solo Practice Needs —{" "}
              <span className="text-primary">Zero Overhead</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for coaches and consultants who run every session themselves.
              AI handles the admin so you stay focused on delivering value.
            </p>
          </div>

          {/* Feature 1: Commitment Tracking - Large showcase */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
                <CheckCircle className="h-4 w-4" />
                Automatic Detection
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">
                AI Catches Every Commitment
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                &quot;I&apos;ll send that by Friday&quot; becomes a tracked deliverable instantly. 
                No more lost action items buried in meeting notes.
              </p>
              <ul className="space-y-3">
                {["Auto-detected from conversation", "Assigned owners & due dates", "Syncs to your calendar"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Action Items</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { text: "Send revised proposal to Sarah", due: "Tomorrow", status: "urgent" },
                  { text: "Schedule follow-up call with engineering", due: "Friday", status: "pending" },
                  { text: "Share competitive analysis deck", due: "Next week", status: "pending" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.status === 'urgent' ? 'border-warning/30 bg-warning/5' : 'border-border/50 bg-muted/20'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 ${item.status === 'urgent' ? 'border-warning' : 'border-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.text}</p>
                      <p className="text-xs text-muted-foreground">Due: {item.due}</p>
                    </div>
                    {item.status === 'urgent' && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-warning/20 text-warning rounded-full">URGENT</span>
                    )}
                  </div>
                ))}
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" />
                  <span>3 items detected from today&apos;s session</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Personas - Reverse layout */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1 rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">AI Persona Selection</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Strategy Advisor", icon: Target, color: "primary", active: true },
                    { name: "Sales Coach", icon: TrendingUp, color: "success", active: false },
                    { name: "Technical Reviewer", icon: FileText, color: "warning", active: false },
                    { name: "Executive Coach", icon: Users, color: "accent", active: false },
                  ].map((persona, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        persona.active 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                        persona.active ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <persona.icon className={`h-5 w-5 ${persona.active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <p className={`text-sm font-medium ${persona.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {persona.name}
                      </p>
                      {persona.active && (
                        <span className="text-[10px] text-primary font-medium">ACTIVE</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Strategy Advisor mode:</p>
                  <p className="text-sm text-foreground">&quot;Consider asking about their Q3 budget timeline...&quot;</p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Brain className="h-4 w-4" />
                Context-Aware AI
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">
                Switch AI Modes On The Fly
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Strategy session? Sales call? Technical review? Switch personas instantly 
                and get suggestions tailored to your current context.
              </p>
              <ul className="space-y-3">
                {["Pre-built expert personas", "Custom persona creation", "Context carries between modes"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3: Knowledge Base - Full width */}
          <div className="rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden mb-24">
            <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Client Knowledge Base — Acme Corp</span>
              </div>
              <span className="text-xs text-success font-medium">● AI has full context</span>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Sources & Documents
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Q4 Strategy Deck.pdf", type: "PDF", size: "2.4 MB" },
                      { name: "acmecorp.com", type: "Website", size: "Indexed" },
                      { name: "Product Roadmap 2025", type: "Doc", size: "1.1 MB" },
                      { name: "Competitor Analysis", type: "PDF", size: "3.2 MB" },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} · {doc.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-warning" />
                    AI Knowledge
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                      <p className="text-xs text-warning font-medium mb-1">Key Insight</p>
                      <p className="text-sm text-foreground">Budget cycle ends March 15th</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-xs text-accent font-medium mb-1">Decision Maker</p>
                      <p className="text-sm text-foreground">Sarah Chen, VP Strategy</p>
                    </div>
                    <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                      <p className="text-xs text-success font-medium mb-1">Priority</p>
                      <p className="text-sm text-foreground">Cost reduction initiatives</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Live AI Suggestions - Animated */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium mb-4">
                <Brain className="h-4 w-4" />
                Real-Time Intelligence
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">
                AI Suggests While You Talk
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Watch as AI listens to your conversation and surfaces the perfect question 
                or captures action items as they happen. Zero effort, maximum insight.
              </p>
              <ul className="space-y-3">
                {["Contextual question suggestions", "Auto-detected action items", "Smart follow-up prompts"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-warning flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Live Session — Q4 Planning</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-destructive">
                  <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  Recording
                </span>
              </div>
              <div className="p-5">
                {/* Transcript snippet */}
                <div className="space-y-3 mb-4 pb-4 border-b border-border/50">
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[50px]">Client:</span>
                    <span className="text-foreground">&quot;...we&apos;re targeting 40% growth but the team is already stretched...&quot;</span>
                  </div>
                </div>
                {/* AI Suggestions - Animated */}
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Brain className="h-3 w-3 text-warning" />
                    AI Suggestions
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-warning/5 border border-warning/20 animate-pulse">
                      <p className="text-xs text-warning font-medium mb-1">💡 Ask This</p>
                      <p className="text-sm text-foreground">&quot;What&apos;s the hiring timeline for Q1?&quot;</p>
                    </div>
                    <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                      <p className="text-xs text-success font-medium mb-1">✓ Action Detected</p>
                      <p className="text-sm text-foreground">&quot;Review capacity plan before next call&quot;</p>
                    </div>
                    <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 opacity-60">
                      <p className="text-xs text-accent font-medium mb-1">📊 Context</p>
                      <p className="text-sm text-foreground">&quot;Last quarter they mentioned budget freeze...&quot;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 5: Plan Builder with AI - Animated typing */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 lg:order-1 rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Do The Thing™ — Growth Plan</span>
              </div>
              <div className="p-5">
                {/* Plan header */}
                <div className="mb-4 pb-3 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground">Phase 1: Foundation</p>
                  <p className="text-xs text-muted-foreground">Q1 2026 · 12 weeks</p>
                </div>
                {/* Plan items with AI typing */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-4 h-4 rounded border-2 border-success bg-success/20 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm text-muted-foreground line-through">Define target personas</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-4 h-4 rounded border-2 border-success bg-success/20 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm text-muted-foreground line-through">Build sales playbook v1</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-4 h-4 rounded border-2 border-primary" />
                    <span className="text-sm text-foreground">Launch outbound campaign</span>
                    <span className="ml-auto text-xs text-primary font-medium">IN PROGRESS</span>
                  </div>
                  {/* AI typing suggestion */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/20 border-dashed">
                    <Brain className="h-4 w-4 text-warning" />
                    <span className="text-sm text-warning">
                      <span className="opacity-80">AI: </span>
                      <span className="inline-flex">
                        Set up tracking dashboard
                        <span className="animate-pulse ml-0.5">|</span>
                      </span>
                    </span>
                    <button className="ml-auto text-xs bg-warning/20 text-warning px-2 py-0.5 rounded font-medium hover:bg-warning/30 transition-colors">
                      + Add
                    </button>
                  </div>
                </div>
                {/* Metrics preview */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Success Metrics</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-success/10 text-success text-xs">10 demos booked</span>
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">$50k pipeline</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Target className="h-4 w-4" />
                Strategic Planning
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">
                AI Builds Your Plan With You
              </h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Start typing and watch AI complete your thoughts. From high-level strategy 
                to granular tasks — build executable plans in minutes, not hours.
              </p>
              <ul className="space-y-3">
                {["AI-powered auto-complete", "Smart task suggestions", "Built-in success metrics"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 6: Share with Clients - Portal Preview */}
          <div className="rounded-2xl border-2 border-border/50 bg-card shadow-corporate-lg overflow-hidden">
            <div className="grid lg:grid-cols-5">
              {/* Left side - description */}
              <div className="lg:col-span-2 p-8 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-border/50">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4 w-fit">
                  <Users className="h-4 w-4" />
                  Client Portal
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Share Directly With Clients
                </h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  One click to share plans, strategies, and progress. Clients see a beautiful, 
                  branded view — you stay in control of what&apos;s visible.
                </p>
                <ul className="space-y-3">
                  {["Branded client workspace", "Real-time updates", "Granular access control"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-foreground">
                      <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right side - portal mockup */}
              <div className="lg:col-span-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
                <div className="rounded-xl border border-border/50 bg-card shadow-lg overflow-hidden">
                  {/* Portal header */}
                  <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Acme Corp&apos;s Workspace</p>
                      <p className="text-xs text-muted-foreground">Shared by Your Consulting</p>
                    </div>
                  </div>
                  {/* Portal content */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Shared items */}
                      <div className="col-span-1 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Shared Items</p>
                        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Rocket className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium truncate">Growth Plan</span>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30 border border-border/50 cursor-pointer opacity-60">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium truncate">Strategy Canvas</span>
                          </div>
                        </div>
                      </div>
                      {/* Preview */}
                      <div className="col-span-2 p-3 rounded-lg bg-muted/20 border border-border/50">
                        <p className="text-sm font-semibold text-foreground mb-2">Growth Plan — Phase 1</p>
                        <div className="space-y-1.5">
                          <div className="h-2 bg-success rounded-full w-3/4" />
                          <p className="text-xs text-muted-foreground">75% complete · 3 items remaining</p>
                        </div>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-success" />
                            <span className="text-muted-foreground line-through">Define personas</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-success" />
                            <span className="text-muted-foreground line-through">Build playbook</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full border border-primary" />
                            <span className="text-foreground">Launch campaign</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Live indicator */}
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-success">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      Updates in real-time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-28 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
              Start Delivering More Value Today
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in under 5 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "1",
                title: "Add Your Clients",
                description:
                  "Create client profiles, upload documents, add website URLs — we build the context automatically.",
              },
              {
                step: "2",
                title: "Run Your Sessions",
                description:
                  "Plan your agenda, start recording, and let AI assist you with real-time insights and suggestions.",
              },
              {
                step: "3",
                title: "Deliver Results",
                description:
                  "Auto-generated summaries, tracked action items, and full context ready for every follow-up.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-corporate">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
              For Coaches & Consultants{" "}
              <span className="text-primary">Who Deliver</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re an executive coach, business strategist, or solo advisor —
              ConsultantOS scales your impact without scaling your team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Users,
                title: "Executive & Business Coaching",
                description:
                  "Run transformational coaching sessions with AI capturing insights. Track client progress across sessions and surface patterns.",
                tags: ["Leadership", "Performance", "Growth"],
              },
              {
                icon: TrendingUp,
                title: "Strategy Consulting",
                description:
                  "Facilitate strategy sessions with built-in frameworks. AI tracks deliverables and keeps clients accountable.",
                tags: ["Strategy", "Roadmapping", "Planning"],
              },
              {
                icon: BarChart3,
                title: "Sales & Revenue Coaching",
                description:
                  "Review pipelines, build playbooks, design outreach sequences. AI assists with messaging and deal strategy.",
                tags: ["Pipeline", "Sequences", "Deals"],
              },
              {
                icon: Target,
                title: "Startup Advisory",
                description:
                  "Support founders on product, fundraising, and GTM. All context organized and ready for every call.",
                tags: ["Founders", "GTM", "Fundraising"],
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="p-7 rounded-2xl border-2 border-border/50 bg-card hover:shadow-corporate-md transition-all duration-200"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <useCase.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {useCase.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$0",
                period: "",
                description: "For trying out the platform",
                features: [
                  "3 client profiles",
                  "10 sessions/month",
                  "Basic AI suggestions",
                  "Document uploads",
                ],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Pro",
                price: "$499",
                period: "/month",
                description: "For active consultants",
                features: [
                  "Unlimited clients",
                  "Unlimited sessions",
                  "Real-time transcription",
                  "Custom AI personas",
                  "Priority AI processing",
                  "Email integration",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Enterprise",
                price: "Starting at $4,999",
                period: "",
                description: "For consulting firms",
                features: [
                  "Everything in Pro",
                  "Low-latency AI responses",
                  "Dedicated infrastructure",
                  "Custom integrations",
                  "Analytics dashboard",
                  "SSO & security",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl border-2 transition-all duration-200 ${
                  plan.popular
                    ? "border-primary bg-card shadow-corporate-lg"
                    : "border-border/50 bg-card hover:shadow-corporate-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3 mb-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm text-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                </SignedIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about running your practice with ConsultantOS.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Who is ConsultantOS built for?",
                a: "ConsultantOS is built for solo consultants and independent coaches who do the work themselves—not firms that delegate. Whether you're an executive coach, business consultant, strategy advisor, or any professional who runs client sessions independently, ConsultantOS helps you operate at a higher level without additional staff.",
              },
              {
                q: "How does the AI assistance work during sessions?",
                a: "During client sessions, ConsultantOS transcribes the conversation in real-time and provides AI-powered suggestions. The AI detects action items as they're mentioned, suggests relevant questions based on the context, surfaces insights from previous sessions, and helps you stay fully engaged while never missing a commitment.",
              },
              {
                q: "What are AI personas?",
                a: "AI personas are specialized modes that adapt the AI's suggestions to your current context. Switch between Strategy Advisor, Sales Coach, Executive Coach, or create custom personas for your specific practice. Each persona provides contextually relevant prompts and insights.",
              },
              {
                q: "Can I share plans and progress with clients?",
                a: "Yes! ConsultantOS includes a client portal feature that lets you share plans, strategies, and progress updates directly with clients. You control exactly what's visible, and clients see a beautiful, branded view that updates in real-time.",
              },
              {
                q: "What is the Clarity Method™?",
                a: "The Clarity Method™ is a built-in strategic diagnosis framework that helps you guide clients from confusion to clarity. It includes structured canvases for defining strategic truth, setting north star constraints, identifying what to kill, mapping risks, and creating execution swimlanes.",
              },
              {
                q: "What is Do The Thing™?",
                a: "Do The Thing™ is an execution planning tool within ConsultantOS. It helps you turn strategy into action by creating structured plans with objectives, success metrics, and trackable initiatives. AI assists by suggesting tasks, tracking progress, and keeping plans aligned with client goals.",
              },
              {
                q: "Is my client data secure?",
                a: "Absolutely. All data is encrypted in transit and at rest. Each client's data is completely isolated. We never train AI models on your client data, and you maintain full ownership and control of all information stored in the platform.",
              },
              {
                q: "How much does it cost?",
                a: "ConsultantOS offers three tiers: Starter (free) with 3 clients and 10 sessions/month, Pro ($499/month) with unlimited clients, sessions, and priority AI processing, and Enterprise (starting at $4,999/month) with dedicated infrastructure and custom integrations.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group border-2 border-border/50 rounded-xl bg-card hover:shadow-corporate-md transition-all duration-200"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-semibold text-foreground pr-4">
                    {faq.q}
                  </h3>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-200 flex-shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
            Run Your Practice Like a Pro
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join hundreds of solo coaches and consultants delivering more value — without hiring a team.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 ConsultantOS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
