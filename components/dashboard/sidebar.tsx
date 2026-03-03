"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  ScrollText,
  Clock,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type Role } from "@/lib/dashboard-context";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { LocationSelector } from "./location-selector";
import { UserNav } from "./user-nav";

// ─── Navigation Config ──────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function getNavGroups(role: Role): NavGroup[] {
  switch (role) {
    case "ADMIN":
      return [
        {
          label: "Overview",
          items: [
            {
              label: "Dashboard",
              href: "/admin/dashboard",
              icon: LayoutDashboard,
            },
          ],
        },
        {
          label: "Management",
          items: [
            { label: "People", href: "/admin/people", icon: Users },
            { label: "Locations", href: "/admin/locations", icon: MapPin },
            {
              label: "Schedule",
              href: "/admin/schedule",
              icon: CalendarDays,
            },
          ],
        },
        {
          label: "Insights",
          items: [
            {
              label: "Analytics",
              href: "/admin/analytics",
              icon: BarChart3,
            },
            { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
          ],
        },
        {
          label: "Settings",
          items: [
            {
              label: "Notifications",
              href: "/settings/notifications",
              icon: Settings,
            },
          ],
        },
      ];
    case "MANAGER":
      return [
        {
          label: "Overview",
          items: [
            {
              label: "Dashboard",
              href: "/manager/dashboard",
              icon: LayoutDashboard,
            },
          ],
        },
        {
          label: "Management",
          items: [
            {
              label: "Schedule",
              href: "/manager/schedule",
              icon: CalendarDays,
            },
            { label: "Staff", href: "/manager/staff", icon: Users },
            {
              label: "Swaps",
              href: "/manager/swaps",
              icon: ArrowLeftRight,
            },
          ],
        },
        {
          label: "Insights",
          items: [
            {
              label: "Analytics",
              href: "/manager/analytics",
              icon: BarChart3,
            },
          ],
        },
        {
          label: "Settings",
          items: [
            {
              label: "Notifications",
              href: "/settings/notifications",
              icon: Settings,
            },
          ],
        },
      ];
    case "STAFF":
      return [
        {
          label: "Overview",
          items: [
            {
              label: "Dashboard",
              href: "/staff/dashboard",
              icon: LayoutDashboard,
            },
          ],
        },
        {
          label: "My Work",
          items: [
            {
              label: "My Schedule",
              href: "/staff/schedule",
              icon: CalendarDays,
            },
            { label: "Availability", href: "/staff/availability", icon: Clock },
            { label: "Swaps", href: "/staff/swaps", icon: ArrowLeftRight },
          ],
        },
        {
          label: "Settings",
          items: [
            {
              label: "Notifications",
              href: "/settings/notifications",
              icon: Settings,
            },
          ],
        },
      ];
  }
}

// ─── Sidebar Link ────────────────────────────────────────

function SidebarLink({
  item,
  isOpen,
}: {
  item: NavItem;
  isOpen: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  const link = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150",
        isOpen ? "px-3 py-2 mx-2" : "p-2 mx-auto w-10 justify-center",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="active-nav"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary",
            isOpen ? "left-0" : "left-0"
          )}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}
      <item.icon className="size-4 shrink-0" />
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ─── Desktop Sidebar ─────────────────────────────────────

export function Sidebar() {
  const { profile, locations, sidebarOpen: isOpen } = useDashboard();
  const navGroups = getNavGroups(profile.role);
  const showLocationSelector = locations.length > 0;

  return (
    <TooltipProvider>
      <motion.aside
        animate={{ width: isOpen ? 256 : 64 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden md:flex flex-col h-svh bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden"
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 h-14 shrink-0 border-b border-sidebar-border",
            isOpen ? "px-4" : "justify-center"
          )}
        >
          <Image
            src="/shiftsync-logo-nobg.png"
            alt="ShiftSync"
            width={28}
            height={28}
            className="shrink-0"
          />
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-lg font-bold tracking-tight font-display whitespace-nowrap overflow-hidden"
              >
                ShiftSync
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Location selector */}
        {showLocationSelector && (
          <div
            className={cn(
              "shrink-0 border-b border-sidebar-border",
              isOpen ? "px-2 py-2" : "px-1 py-2"
            )}
          >
            <LocationSelector collapsed={!isOpen} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 px-5 py-1"
                  >
                    {group.label}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.href} item={item} isOpen={isOpen} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border",
            isOpen ? "px-2 py-2" : "px-1 py-2"
          )}
        >
          <UserNav collapsed={!isOpen} />
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

// ─── Mobile Sidebar (overlay) ────────────────────────────

export function MobileSidebar() {
  const { profile, locations, mobileOpen, setMobileOpen } = useDashboard();
  const navGroups = getNavGroups(profile.role);
  const showLocationSelector = locations.length > 0;

  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col md:hidden"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 h-14 px-4 shrink-0 border-b border-sidebar-border">
              <Image
                src="/shiftsync-logo-nobg.png"
                alt="ShiftSync"
                width={28}
                height={28}
              />
              <span className="text-lg font-bold tracking-tight font-display">
                ShiftSync
              </span>
            </div>

            {/* Location selector */}
            {showLocationSelector && (
              <div className="shrink-0 border-b border-sidebar-border px-2 py-2">
                <LocationSelector />
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 space-y-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 px-5 py-1">
                    {group.label}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <MobileNavLink
                        key={item.href}
                        item={item}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* User card */}
            <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
              <UserNav />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MobileNavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-[13px] font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
