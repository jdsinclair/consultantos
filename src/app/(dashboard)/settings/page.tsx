"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Globe, Phone, Mail, Save, Loader2, Check, Copy, Brain } from "lucide-react";
import { AISettingsTab } from "@/components/settings/ai-settings-tab";
import { AIProfile } from "@/db/schema";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  businessName: string | null;
  website: string | null;
  phone: string | null;
  bio: string | null;
  specialties: string[] | null;
  ingestEmail: string | null;
  // AI Profile fields
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

const SPECIALTIES = [
  "Strategy",
  "Sales",
  "Marketing",
  "Product",
  "Operations",
  "Finance",
  "HR",
  "Technology",
  "Growth",
  "Fundraising",
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          nickname: profile.nickname,
          businessName: profile.businessName,
          website: profile.website,
          phone: profile.phone,
          bio: profile.bio,
          specialties: profile.specialties,
          // AI Profile fields
          linkedin: profile.linkedin,
          otherWebsites: profile.otherWebsites,
          personalStory: profile.personalStory,
          methodology: profile.methodology,
          notableClients: profile.notableClients,
          contentAssets: profile.contentAssets,
          uniquePerspective: profile.uniquePerspective,
          communicationStyle: profile.communicationStyle,
          aiContextSummary: profile.aiContextSummary,
          aiProfile: profile.aiProfile,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    if (!profile) return;
    const current = profile.specialties || [];
    const updated = current.includes(specialty)
      ? current.filter((s) => s !== specialty)
      : [...current, specialty];
    setProfile({ ...profile, specialties: updated });
  };

  const copyIngestEmail = () => {
    if (profile?.ingestEmail) {
      navigator.clipboard.writeText(profile.ingestEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAIProfileChange = (updates: Partial<UserProfile>) => {
    if (!profile) return;
    setProfile({ ...profile, ...updates });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, business, and AI preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            AI
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your consultant profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name || ""}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname (optional)</Label>
                  <Input
                    id="nickname"
                    value={profile.nickname || ""}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    placeholder="How clients call you"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email is managed by your login provider</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about your consulting practice..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Ingestion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Ingestion
              </CardTitle>
              <CardDescription>Forward emails to add them to your system</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.ingestEmail ? (
                <div className="space-y-2">
                  <Label>Your Ingest Email Address</Label>
                  <div className="flex gap-2">
                    <Input value={profile.ingestEmail} readOnly className="bg-muted font-mono text-sm" />
                    <Button variant="outline" onClick={copyIngestEmail}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Forward emails to this address and they&apos;ll appear in your Emails inbox
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete onboarding to get your unique email ingest address
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={profile.businessName || ""}
                    onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                    placeholder="Your Company LLC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="website"
                      value={profile.website || ""}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://yoursite.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative max-w-xs">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant={profile.specialties?.includes(specialty) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <AISettingsTab profile={profile} onProfileChange={handleAIProfileChange} />
        </TabsContent>
      </Tabs>

      {/* Save Button - Fixed at bottom */}
      <div className="flex justify-end mt-8 sticky bottom-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
