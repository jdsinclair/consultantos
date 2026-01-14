"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip check if already on onboarding page
      if (pathname === "/onboarding") {
        setLoading(false);
        setCanShow(true);
        return;
      }

      try {
        const res = await fetch("/api/user");
        if (!res.ok) {
          setLoading(false);
          setCanShow(true);
          return;
        }

        const user = await res.json();

        if (!user.onboardingCompleted) {
          router.replace("/onboarding");
        } else {
          setCanShow(true);
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        setCanShow(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canShow) {
    return null;
  }

  return <>{children}</>;
}
