"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Briefcase,
  Globe,
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Users,
  Loader2,
} from "lucide-react";

interface OnboardingData {
  name: string;
  nickname: string;
  businessName: string;
  website: string;
  phone: string;
  bio: string;
  specialties: string[];
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    nickname: "",
    businessName: "",
    website: "",
    phone: "",
    bio: "",
    specialties: [],
  });

  const totalSteps = 3;

  const updateData = (field: keyof OnboardingData, value: string | string[]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialty = (specialty: string) => {
    setData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
      // Save progress
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      });
    } else {
      // Complete onboarding
      setLoading(true);
      try {
        await fetch("/api/user/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        router.push("/dashboard");
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        setLoading(false);
      }
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.name.length > 0;
      case 2:
        return true; // Optional
      case 3:
        return true; // Optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((step / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: About You */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Tell us about yourself</CardTitle>
                  <CardDescription>
                    This helps the AI understand who you are
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={data.name}
                    onChange={(e) => updateData("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">
                    Nickname{" "}
                    <span className="text-muted-foreground">(AI will use this)</span>
                  </Label>
                  <Input
                    id="nickname"
                    placeholder="John"
                    value={data.nickname}
                    onChange={(e) => updateData("nickname", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business / Company Name</Label>
                <Input
                  id="businessName"
                  placeholder="Smith Consulting"
                  value={data.businessName}
                  onChange={(e) => updateData("businessName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About You</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your consulting practice, experience, and what makes you unique..."
                  value={data.bio}
                  onChange={(e) => updateData("bio", e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This context helps the AI give you better, more personalized suggestions
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contact & Specialties */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Your Practice</CardTitle>
                  <CardDescription>
                    Contact info and areas of expertise
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      placeholder="https://yoursite.com"
                      value={data.website}
                      onChange={(e) => updateData("website", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      value={data.phone}
                      onChange={(e) => updateData("phone", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Your Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((specialty) => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => toggleSpecialty(specialty)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        data.specialties.includes(specialty)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {specialty}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Getting Started Checklist */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>You're all set!</CardTitle>
                  <CardDescription>
                    Here's what you can do next
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your account is ready. After onboarding, you can:
              </p>

              <div className="space-y-3">
                {[
                  {
                    icon: Users,
                    title: "Add your first client",
                    description: "Create a client profile and upload relevant docs",
                  },
                  {
                    icon: FileText,
                    title: "Add sources",
                    description: "Upload PDFs, paste website URLs, link GitHub repos",
                  },
                  {
                    icon: Mail,
                    title: "Set up email forwarding",
                    description: "Forward client emails to import them automatically",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Your Email Inbox</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Forward emails to this address to import them into ConsultantOS:
                    </p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      inbox-{data.nickname?.toLowerCase() || "you"}@ingest.consultantos.com
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === totalSteps ? "Complete Setup" : "Continue"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
