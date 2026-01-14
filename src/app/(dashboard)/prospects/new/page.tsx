"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { ArrowLeft, Loader2, Globe, Sparkles, Zap, User, Mail, Phone } from "lucide-react";
import Link from "next/link";

const sourceTypes = [
  { id: "inbound", label: "Inbound (they found me)" },
  { id: "referral", label: "Referral" },
  { id: "outreach", label: "Outreach (I found them)" },
  { id: "email", label: "Email intro" },
  { id: "other", label: "Other" },
];

export default function NewProspectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "", // Stored in E.164 format
    phoneCountryCode: "US",
    company: "",
    website: "",
    industry: "",
    description: "",
    sourceType: "",
    sourceNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent, evaluate: boolean = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Compute display name from first/last name or company
      const displayName = formData.firstName
        ? `${formData.firstName} ${formData.lastName}`.trim()
        : formData.company || "Unnamed Prospect";

      // Create the prospect
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: displayName,
          email: formData.email,
          phone: formData.phone,
          phoneCountryCode: formData.phoneCountryCode,
          company: formData.company,
          website: formData.website,
          industry: formData.industry,
          description: formData.description,
          sourceType: formData.sourceType,
          sourceNotes: formData.sourceNotes,
          status: "prospect",
        }),
      });

      if (!res.ok) throw new Error("Failed to create prospect");

      const prospect = await res.json();

      if (evaluate && formData.website) {
        setEvaluating(true);

        // Fetch website content first
        try {
          const crawlRes = await fetch("/api/crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: formData.website }),
          });

          let websiteContent = "";
          if (crawlRes.ok) {
            const crawlData = await crawlRes.json();
            websiteContent = crawlData.content || "";
          }

          // Run evaluation
          await fetch("/api/prospects/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: prospect.id,
              websiteContent,
              additionalContext: formData.description,
            }),
          });
        } catch (evalError) {
          console.error("Evaluation failed:", evalError);
          // Continue anyway - they can evaluate later
        }
      }

      router.push(`/prospects/${prospect.id}`);
    } catch (error) {
      console.error("Failed to create prospect:", error);
      setLoading(false);
      setEvaluating(false);
    }
  };

  const canEvaluate = formData.website || formData.description;
  const hasMinimumInfo = formData.firstName || formData.company || formData.website;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link
        href="/prospects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Prospects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Add New Prospect
          </CardTitle>
          <CardDescription>
            Enter what you know - even just a URL works. The AI will do the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Quick Add - Just URL */}
            <div className="p-4 rounded-lg bg-accent/50 border border-dashed">
              <Label className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4" />
                Quick Add - Just paste a URL
              </Label>
              <Input
                placeholder="https://company.com"
                value={formData.website}
                onChange={(e) => {
                  setFormData({ ...formData, website: e.target.value });
                  // Try to extract company name from URL
                  if (!formData.company && e.target.value) {
                    try {
                      const url = new URL(e.target.value);
                      const domain = url.hostname.replace("www.", "");
                      const name = domain.split(".")[0];
                      setFormData((prev) => ({
                        ...prev,
                        website: e.target.value,
                        company: name.charAt(0).toUpperCase() + name.slice(1),
                      }));
                    } catch {
                      // Invalid URL, ignore
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                We&apos;ll crawl this and auto-fill what we can
              </p>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Or add more details manually:
              </p>

              {/* Contact Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Contact Information
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <PhoneInput
                    value={formData.phone}
                    defaultCountry="US"
                    onChange={(e164, _formatted, country) =>
                      setFormData({
                        ...formData,
                        phone: e164,
                        phoneCountryCode: country,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste any format - we'll auto-detect the country
                  </p>
                </div>
              </div>

              {/* Company Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Acme Corp"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Fintech, Healthcare, SaaS"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="description">What do you know?</Label>
                <Textarea
                  id="description"
                  placeholder="Paste an email, notes from a call, their pitch deck summary, anything..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  The more context, the better the evaluation
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceType">How did they find you?</Label>
                  <select
                    id="sourceType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.sourceType}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceType: e.target.value })
                    }
                  >
                    <option value="">Select...</option>
                    {sourceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceNotes">Source details</Label>
                  <Input
                    id="sourceNotes"
                    placeholder="e.g., Referred by John Smith"
                    value={formData.sourceNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, sourceNotes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading || !hasMinimumInfo || !canEvaluate}
                className="gap-2 w-full sm:w-auto"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Evaluating...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Create & Evaluate
                  </>
                )}
              </Button>

              <Button
                type="submit"
                variant="outline"
                disabled={loading || !hasMinimumInfo}
                className="w-full sm:w-auto"
              >
                {loading && !evaluating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Just Save
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
