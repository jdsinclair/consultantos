"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDealMode } from "@/contexts/deal-mode";
import { Logo } from "@/components/ui/logo";
import { BulkClientsRevenueModal } from "@/components/bulk-clients-revenue-modal";
import {
  Users,
  FileText,
  Mic,
  BookOpen,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Mail,
  CheckCircle,
  UserPlus,
  DollarSign,
  Sparkles,
  Bug,
  Menu,
  X,
  TrendingUp,
  ScrollText,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Prospects", href: "/prospects", icon: UserPlus },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Sessions", href: "/session", icon: Mic },
  { name: "Action Items", href: "/action-items", icon: CheckCircle },
  { name: "Methods", href: "/methods", icon: BookOpen },
  { name: "Personas", href: "/personas", icon: Sparkles },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Transcripts", href: "/transcripts", icon: ScrollText },
  { name: "Sources", href: "/sources", icon: FileText },
  { name: "Debug", href: "/debug", icon: Bug },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

function SidebarContent({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { dealModeEnabled, toggleDealMode } = useDealMode();
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const handleLinkClick = () => {
    if (mobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo size="default" />
        {mobile && (
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-corporate"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Deal Mode Toggle with Revenue Modal */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDealMode}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex-1",
              dealModeEnabled
                ? "bg-green-600 text-white hover:bg-green-700"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title={dealModeEnabled ? "Hide deal values" : "Show deal values"}
          >
            <DollarSign className="h-5 w-5" />
            {dealModeEnabled ? "$ ON" : "$ OFF"}
          </button>
          <button
            onClick={() => setShowRevenueModal(true)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              dealModeEnabled
                ? "bg-green-700 text-white hover:bg-green-800"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title="View revenue overview"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
        </div>

        {/* Revenue Modal */}
        <BulkClientsRevenueModal
          open={showRevenueModal}
          onOpenChange={setShowRevenueModal}
        />

        {/* Settings */}
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground shadow-corporate"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}

// Desktop Sidebar - hidden on mobile
export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-full w-64 flex-col border-r border-border">
      <SidebarContent />
    </aside>
  );
}

// Mobile Sidebar with slide-out drawer
export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-foreground/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:hidden transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent mobile onClose={() => onOpenChange(false)} />
      </aside>
    </>
  );
}

// Mobile Header with hamburger menu
export function MobileHeader({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  return (
    <div className="flex lg:hidden items-center gap-3">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Logo size="sm" showText={false} />
    </div>
  );
}
