"use client";

import { Sidebar } from "@/components/sidebar";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { GlobalSearch } from "@/components/global-search";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar with search and user */}
          <header className="h-14 border-b border-border flex items-center justify-between px-6">
            <GlobalSearch />
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </OnboardingGuard>
  );
}
