"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Clock,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type Role } from "@/lib/dashboard-context";

// ─── Tab Config ──────────────────────────────────────────

interface TabItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

function getTabs(role: Role): TabItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { label: "Home", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "People", href: "/admin/people", icon: Users },
        { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
        { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      ];
    case "MANAGER":
      return [
        { label: "Home", href: "/manager/dashboard", icon: LayoutDashboard },
        { label: "Schedule", href: "/manager/schedule", icon: CalendarDays },
        { label: "Swaps", href: "/manager/swaps", icon: ArrowLeftRight },
        { label: "Analytics", href: "/manager/analytics", icon: BarChart3 },
      ];
    case "STAFF":
      return [
        { label: "Home", href: "/staff/dashboard", icon: LayoutDashboard },
        { label: "Schedule", href: "/staff/schedule", icon: CalendarDays },
        { label: "Available", href: "/staff/availability", icon: Clock },
        { label: "Swaps", href: "/staff/swaps", icon: ArrowLeftRight },
      ];
  }
}

// ─── Component ───────────────────────────────────────────

export function BottomTabBar() {
  const { profile } = useDashboard();
  const pathname = usePathname();
  const tabs = getTabs(profile.role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <tab.icon
                className={cn(
                  "size-5",
                  isActive && "text-primary"
                )}
              />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
