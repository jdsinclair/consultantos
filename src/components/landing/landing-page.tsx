"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Mic,
  Brain,
  Target,
  CheckCircle,
  FileText,
  Users,
  Zap,
  ArrowRight,
  Play,
  Star,
  MessageSquare,
  Clock,
  Shield,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">ConsultantOS</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started Free</Button>
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <Zap className="h-4 w-4" />
              AI-Powered Consulting Assistant
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Your AI Co-Pilot for{" "}
              <span className="text-primary">Consulting</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop juggling notes, action items, and client context. ConsultantOS gives you
              real-time AI assistance during calls, tracks commitments automatically, and
              keeps all your client knowledge organized.
            </p>
            <div className="flex items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg" className="gap-2">
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
              <Button variant="outline" size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Live Session - Pathogen Detection Co</span>
              </div>
              <div className="p-6 bg-gradient-to-br from-card to-muted/20">
                <div className="grid grid-cols-3 gap-6">
                  {/* Transcript */}
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      Live Transcript
                      <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-2">
                        <span className="text-primary font-medium">Client:</span>
                        <span className="text-muted-foreground">The Florida opportunity is really exciting for us...</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-green-500 font-medium">You:</span>
                        <span className="text-muted-foreground">I've been looking at similar state contracts and...</span>
                      </div>
                    </div>
                  </div>
                  {/* Suggestions */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Brain className="h-4 w-4 text-yellow-500" />
                      AI Suggestions
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs">
                        Ask about their timeline for the RFP response
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
                        You committed to send the one-pager by Friday
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
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background"
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">500+ consultants</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              ))}
              <span className="text-sm text-muted-foreground ml-2">4.9/5 rating</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">10,000+</span> sessions powered
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you need to{" "}
              <span className="text-primary">10x your consulting</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop context-switching between notes, docs, and action items.
              ConsultantOS keeps everything in one place with AI that actually helps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: "Live Session Assistant",
                description:
                  "Real-time transcription with AI suggestions during calls. Never miss a commitment or talking point.",
              },
              {
                icon: CheckCircle,
                title: "Auto Action Items",
                description:
                  "AI detects commitments as you speak. 'I'll send that by Friday' automatically becomes a tracked task.",
              },
              {
                icon: FileText,
                title: "Client Knowledge Base",
                description:
                  "Upload docs, crawl websites, index repos. All your client context available to AI instantly.",
              },
              {
                icon: Target,
                title: "Session Gameplans",
                description:
                  "Plan your agenda, AI keeps you on track. Get notified when conversations drift from objectives.",
              },
              {
                icon: Brain,
                title: "Custom AI Personas",
                description:
                  "Strategy Advisor, Sales Coach, Content Writer - switch AI personalities mid-conversation.",
              },
              {
                icon: Users,
                title: "Consulting Frameworks",
                description:
                  "Save your methodologies as reusable templates. AI guides sessions through your proven processes.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in under 5 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Add Your Clients",
                description:
                  "Create client profiles, upload documents, paste their website URL - we'll crawl it automatically.",
              },
              {
                step: "2",
                title: "Start a Session",
                description:
                  "Plan your gameplan, hit record, and let AI assist you in real-time during the call.",
              },
              {
                step: "3",
                title: "Review & Follow Up",
                description:
                  "Get auto-generated summaries, action items tracked, and context ready for next time.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Built for Real Consulting Work
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're doing strategy, sales coaching, or product advisory -
              ConsultantOS adapts to your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Strategy & Advisory",
                description:
                  "Run strategy sessions with AI tracking deliverables. Frameworks like Business Clarity → Demand → Swimlanes built in.",
                tags: ["Strategy", "Roadmapping", "Planning"],
              },
              {
                title: "Sales Consulting",
                description:
                  "Build sales plays, review pipelines, design sequences. AI helps with messaging and objection handling.",
                tags: ["CRM", "Sequences", "Coaching"],
              },
              {
                title: "Product & Technical",
                description:
                  "Product roadmaps, technical reviews, website feedback. Link GitHub repos as context for AI.",
                tags: ["Roadmaps", "Reviews", "Technical"],
              },
              {
                title: "Investor Relations",
                description:
                  "Prep for investor calls, draft updates, track fundraising tasks. All context in one place.",
                tags: ["Fundraising", "Updates", "Prep"],
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-border bg-card"
              >
                <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                <p className="text-muted-foreground mb-4">{useCase.description}</p>
                <div className="flex flex-wrap gap-2">
                  {useCase.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs"
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
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for trying out",
                features: [
                  "3 clients",
                  "10 sessions/month",
                  "Basic AI suggestions",
                  "Document uploads",
                ],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Pro",
                price: "$49",
                description: "For active consultants",
                features: [
                  "Unlimited clients",
                  "Unlimited sessions",
                  "Real-time transcription",
                  "Custom personas",
                  "Email integration",
                  "Priority support",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Team",
                price: "$149",
                description: "For consulting firms",
                features: [
                  "Everything in Pro",
                  "5 team members",
                  "Shared client library",
                  "Team frameworks",
                  "Analytics dashboard",
                  "SSO & security",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`p-8 rounded-xl border ${
                  plan.popular
                    ? "border-primary bg-card shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="text-xs font-medium text-primary mb-4">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "$0" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
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
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to transform your consulting?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of consultants who've upgraded their practice with AI.
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
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">ConsultantOS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground">
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
