"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { ArrowLeft, Loader2, Globe, Save, User, Mail, Phone } from "lucide-react";
import Link from "next/link";

const sourceTypes = [
  { id: "inbound", label: "Inbound (they found me)" },
  { id: "referral", label: "Referral" },
  { id: "outreach", label: "Outreach (I found them)" },
  { id: "email", label: "Email intro" },
  { id: "other", label: "Other" },
];

interface Prospect {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  company: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  sourceType: string | null;
  sourceNotes: string | null;
}

export default function EditProspectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneCountryCode: "US",
    company: "",
    website: "",
    industry: "",
    description: "",
    sourceType: "",
    sourceNotes: "",
  });

  useEffect(() => {
    fetchProspect();
  }, [params.id]);

  const fetchProspect = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) {
        const prospect: Prospect = await res.json();
        setFormData({
          firstName: prospect.firstName || "",
          lastName: prospect.lastName || "",
          email: prospect.email || "",
          phone: prospect.phone || "",
          phoneCountryCode: prospect.phoneCountryCode || "US",
          company: prospect.company || "",
          website: prospect.website || "",
          industry: prospect.industry || "",
          description: prospect.description || "",
          sourceType: prospect.sourceType || "",
          sourceNotes: prospect.sourceNotes || "",
        });
      } else {
        router.push("/prospects");
      }
    } catch (error) {
      console.error("Failed to fetch prospect:", error);
      router.push("/prospects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Compute display name from first/last name or company
      const displayName = formData.firstName
        ? `${formData.firstName} ${formData.lastName}`.trim()
        : formData.company || "Unnamed Prospect";

      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          name: displayName,
          email: formData.email || null,
          phone: formData.phone || null,
          phoneCountryCode: formData.phoneCountryCode,
          company: formData.company || null,
          website: formData.website || null,
          industry: formData.industry || null,
          description: formData.description || null,
          sourceType: formData.sourceType || null,
          sourceNotes: formData.sourceNotes || null,
        }),
      });

      if (res.ok) {
        router.push(`/prospects/${params.id}`);
      } else {
        console.error("Failed to update prospect");
        setSaving(false);
      }
    } catch (error) {
      console.error("Failed to update prospect:", error);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link
        href={`/prospects/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Prospect
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Prospect
          </CardTitle>
          <CardDescription>
            Update the prospect details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                placeholder="https://company.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="description">Notes / Context</Label>
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

            <div className="grid gap-4 sm:grid-cols-2">
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

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
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
