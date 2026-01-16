"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Linkedin,
  Globe,
  BookOpen,
  MessageSquare,
  Brain,
  Target,
  Users,
  Lightbulb,
  Plus,
  X,
  FolderOpen,
  FileText,
  Loader2,
} from "lucide-react";
import { AIProfile } from "@/db/schema";
import { HelpMeAIDialog } from "./help-me-ai-dialog";
import { PersonalSourcesSection } from "./personal-sources-section";

interface UserAIProfile {
  linkedin: string | null;
  otherWebsites: string[] | null;
  personalStory: string | null;
  methodology: string | null;
  notableClients: string | null;
  contentAssets: string | null;
  uniquePerspective: string | null;
  communicationStyle: string | null;
  aiContextSummary: string | null;
  aiProfile: AIProfile | null;
}

interface AISettingsTabProps {
  profile: UserAIProfile;
  onProfileChange: (updates: Partial<UserAIProfile>) => void;
}

const COMMUNICATION_STYLES = [
  "Direct & Blunt",
  "Warm & Supportive",
  "Data-Driven",
  "Strategic",
  "Collaborative",
  "Challenging",
  "Socratic",
  "Visionary",
];

export function AISettingsTab({ profile, onProfileChange }: AISettingsTabProps) {
  const [newWebsite, setNewWebsite] = useState("");
  const [showHelpMe, setShowHelpMe] = useState(false);

  const addWebsite = () => {
    if (newWebsite.trim()) {
      const current = profile.otherWebsites || [];
      onProfileChange({ otherWebsites: [...current, newWebsite.trim()] });
      setNewWebsite("");
    }
  };

  const removeWebsite = (index: number) => {
    const current = profile.otherWebsites || [];
    onProfileChange({ otherWebsites: current.filter((_, i) => i !== index) });
  };

  const toggleCommunicationStyle = (style: string) => {
    const current = profile.communicationStyle || "";
    const styles = current.split(",").map((s) => s.trim()).filter(Boolean);
    if (styles.includes(style)) {
      onProfileChange({ communicationStyle: styles.filter((s) => s !== style).join(", ") });
    } else {
      onProfileChange({ communicationStyle: [...styles, style].join(", ") });
    }
  };

  const currentStyles = (profile.communicationStyle || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header with Help Me Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Personalization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Help the AI understand you so it can give advice in your voice
          </p>
        </div>
        <Button onClick={() => setShowHelpMe(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Help Me Build My Profile
        </Button>
      </div>

      {/* AI Context Summary (if populated) */}
      {profile.aiContextSummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Understanding of You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{profile.aiContextSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Online Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Online Presence
          </CardTitle>
          <CardDescription>
            Your websites and profiles so AI can reference your public content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="linkedin"
                value={profile.linkedin || ""}
                onChange={(e) => onProfileChange({ linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Other Websites & Profiles</Label>
            <div className="flex gap-2">
              <Input
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                placeholder="https://twitter.com/you, podcast URL, etc."
                onKeyDown={(e) => e.key === "Enter" && addWebsite()}
              />
              <Button variant="outline" onClick={addWebsite}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(profile.otherWebsites || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(profile.otherWebsites || []).map((url, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    <span className="max-w-48 truncate">{url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeWebsite(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Twitter/X, YouTube, podcast, newsletter signup, personal website, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Your Story & Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Story
          </CardTitle>
          <CardDescription>
            Background that helps AI understand where you&apos;re coming from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personalStory">Your Journey</Label>
            <Textarea
              id="personalStory"
              value={profile.personalStory || ""}
              onChange={(e) => onProfileChange({ personalStory: e.target.value })}
              placeholder="How did you get into consulting? What's your background? What drives you?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              e.g., &quot;20 years in SaaS, built 3 companies, now help founders avoid mistakes I made...&quot;
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notableClients">Notable Clients & Experience</Label>
            <Textarea
              id="notableClients"
              value={profile.notableClients || ""}
              onChange={(e) => onProfileChange({ notableClients: e.target.value })}
              placeholder="Types of clients you've worked with, industries, company stages..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Can be anonymized: &quot;Series A SaaS companies, enterprise consulting for Fortune 500...&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Your Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Methodology
          </CardTitle>
          <CardDescription>
            How you think about consulting and what makes your approach unique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="methodology">Your Consulting Approach</Label>
            <Textarea
              id="methodology"
              value={profile.methodology || ""}
              onChange={(e) => onProfileChange({ methodology: e.target.value })}
              placeholder="Your frameworks, principles, beliefs about how businesses succeed..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              e.g., &quot;I believe constraint-driven strategy beats vision-driven. Always start with what to stop doing...&quot;
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uniquePerspective">Your Unique Perspective</Label>
            <Textarea
              id="uniquePerspective"
              value={profile.uniquePerspective || ""}
              onChange={(e) => onProfileChange({ uniquePerspective: e.target.value })}
              placeholder="What do you believe that most consultants don't? What's your contrarian view?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              What makes clients come to YOU vs. someone else?
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content & Intellectual Property */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Content & IP
          </CardTitle>
          <CardDescription>
            Content you&apos;ve created that represents your thinking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contentAssets">Content Assets</Label>
            <Textarea
              id="contentAssets"
              value={profile.contentAssets || ""}
              onChange={(e) => onProfileChange({ contentAssets: e.target.value })}
              placeholder="Newsletters, books, courses, frameworks, podcasts you've created..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              e.g., &quot;3000 newsletters on growth strategy, 100 startup frameworks, a book on founder psychology&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Style
          </CardTitle>
          <CardDescription>How you prefer to communicate with clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {COMMUNICATION_STYLES.map((style) => (
              <Badge
                key={style}
                variant={currentStyles.includes(style) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCommunicationStyle(style)}
              >
                {style}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select styles that describe how you communicate. AI will mirror this.
          </p>
        </CardContent>
      </Card>

      {/* Personal Knowledge Base */}
      <PersonalSourcesSection />

      {/* Help Me AI Dialog */}
      <HelpMeAIDialog
        open={showHelpMe}
        onOpenChange={setShowHelpMe}
        currentProfile={profile}
        onProfileUpdate={onProfileChange}
      />
    </div>
  );
}
