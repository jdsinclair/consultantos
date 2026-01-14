"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDealMode } from "@/contexts/deal-mode";
import { Logo } from "@/components/ui/logo";
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
  { name: "Sources", href: "/sources", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { dealModeEnabled, toggleDealMode } = useDealMode();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo size="default" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-corporate"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Deal Mode Toggle */}
        <button
          onClick={toggleDealMode}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
            dealModeEnabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={dealModeEnabled ? "Hide deal values" : "Show deal values"}
        >
          <DollarSign className="h-5 w-5" />
          {dealModeEnabled ? "$ ON" : "$ OFF"}
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground shadow-corporate"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </div>
  );
}
