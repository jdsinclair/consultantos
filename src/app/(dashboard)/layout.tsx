"use client";

import { useState } from "react";
import { Sidebar, MobileSidebar, MobileHeader } from "@/components/sidebar";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { GlobalSearch } from "@/components/global-search";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <OnboardingGuard>
      <div className="flex h-[100dvh]">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar with search and user */}
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 gap-4 flex-shrink-0">
            {/* Mobile: Hamburger + Logo */}
            <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

            {/* Search - grows to fill space */}
            <div className="flex-1 flex justify-center lg:justify-start">
              <GlobalSearch />
            </div>

            {/* User button */}
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </OnboardingGuard>
  );
}
