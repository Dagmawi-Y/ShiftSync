"use client";

import { usePathname } from "next/navigation";
import { PanelLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/lib/dashboard-context";
import { NotificationBell } from "./notification-bell";
import { ThemeSwitcher } from "@/components/theme-switcher";

/** Build breadcrumb segments from the current pathname. */
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, setMobileOpen } = useDashboard();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          onClick={toggleSidebar}
        >
          <PanelLeft className="size-4" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm truncate">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-muted-foreground/40 mx-0.5">/</span>
              )}
              {crumb.isLast ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
