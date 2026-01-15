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
              The Operating System for Elite Consultants
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
              Transform Every Client{" "}
              <span className="text-primary">Engagement</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform that captures context, tracks commitments,
              and provides AI-powered insights during every client conversation.
              Built for consultants who deliver results.
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
                500+ consultants
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
              Built for{" "}
              <span className="text-primary">High-Performance</span> Consulting
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to help you deliver more value,
              track every commitment, and never miss an insight.
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

          {/* Remaining features as cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: "Live Transcription",
                description:
                  "Real-time speech-to-text with speaker identification. Never miss a word.",
              },
              {
                icon: Target,
                title: "Session Gameplans",
                description:
                  "Set objectives before calls. AI keeps you on track and surfaces talking points.",
              },
              {
                icon: Users,
                title: "Framework Library",
                description:
                  "Save proven methodologies as templates. AI guides sessions through your processes.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-7 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/30 hover:shadow-corporate-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
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
              Purpose-Built for{" "}
              <span className="text-primary">Professional Services</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether strategy, sales, product, or fundraising —
              ConsultantOS adapts to your practice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Strategy & Advisory",
                description:
                  "Run strategy sessions with AI tracking deliverables. Built-in frameworks for systematic engagement.",
                tags: ["Strategy", "Roadmapping", "Planning"],
              },
              {
                icon: BarChart3,
                title: "Sales Consulting",
                description:
                  "Build sales plays, review pipelines, design sequences. AI assists with messaging and positioning.",
                tags: ["Pipeline", "Sequences", "Coaching"],
              },
              {
                icon: Target,
                title: "Product & Technical",
                description:
                  "Product roadmaps, technical reviews, architecture feedback. Full codebase context available to AI.",
                tags: ["Roadmaps", "Reviews", "Architecture"],
              },
              {
                icon: Shield,
                title: "Investor Relations",
                description:
                  "Prep for investor calls, draft updates, track fundraising milestones. All context in one place.",
                tags: ["Fundraising", "Updates", "Diligence"],
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

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
            Ready to elevate your practice?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join hundreds of consultants who deliver more value with ConsultantOS.
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
              © 2025 ConsultantOS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
