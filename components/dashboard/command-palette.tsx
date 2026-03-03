"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  Users,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  ScrollText,
  Clock,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type Role } from "@/lib/dashboard-context";

// ─── Command types ───────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  group: string;
  action: () => void;
  keywords?: string[];
}

// ─── Route Commands per Role ─────────────────────────────

function getRouteCommands(
  role: Role,
  navigate: (path: string) => void
): CommandItem[] {
  const admin: CommandItem[] = [
    {
      id: "admin-dashboard",
      label: "Dashboard",
      description: "KPIs & on-duty overview",
      icon: LayoutDashboard,
      group: "Navigate",
      action: () => navigate("/admin/dashboard"),
      keywords: ["home", "overview", "kpi"],
    },
    {
      id: "admin-people",
      label: "People",
      description: "Manage staff & managers",
      icon: Users,
      group: "Navigate",
      action: () => navigate("/admin/people"),
      keywords: ["staff", "users", "employees", "invite"],
    },
    {
      id: "admin-locations",
      label: "Locations",
      description: "Restaurant locations",
      icon: MapPin,
      group: "Navigate",
      action: () => navigate("/admin/locations"),
      keywords: ["restaurant", "site", "branch"],
    },
    {
      id: "admin-schedule",
      label: "Schedule",
      description: "View & manage shifts",
      icon: CalendarDays,
      group: "Navigate",
      action: () => navigate("/admin/schedule"),
      keywords: ["shifts", "calendar", "weekly"],
    },
    {
      id: "admin-analytics",
      label: "Analytics",
      description: "Fairness & overtime reports",
      icon: BarChart3,
      group: "Navigate",
      action: () => navigate("/admin/analytics"),
      keywords: ["reports", "charts", "fairness", "overtime"],
    },
    {
      id: "admin-audit",
      label: "Audit Log",
      description: "Activity history",
      icon: ScrollText,
      group: "Navigate",
      action: () => navigate("/admin/audit"),
      keywords: ["log", "history", "activity", "changes"],
    },
  ];

  const manager: CommandItem[] = [
    {
      id: "manager-dashboard",
      label: "Dashboard",
      description: "Overview & pending tasks",
      icon: LayoutDashboard,
      group: "Navigate",
      action: () => navigate("/manager/dashboard"),
      keywords: ["home", "overview"],
    },
    {
      id: "manager-schedule",
      label: "Schedule",
      description: "Manage weekly shifts",
      icon: CalendarDays,
      group: "Navigate",
      action: () => navigate("/manager/schedule"),
      keywords: ["shifts", "calendar", "weekly"],
    },
    {
      id: "manager-swaps",
      label: "Swap Requests",
      description: "Approve or reject swaps",
      icon: ArrowLeftRight,
      group: "Navigate",
      action: () => navigate("/manager/swaps"),
      keywords: ["trade", "exchange", "request"],
    },
    {
      id: "manager-analytics",
      label: "Analytics",
      description: "Reports & insights",
      icon: BarChart3,
      group: "Navigate",
      action: () => navigate("/manager/analytics"),
      keywords: ["reports", "charts"],
    },
  ];

  const staff: CommandItem[] = [
    {
      id: "staff-dashboard",
      label: "Dashboard",
      description: "Your overview",
      icon: LayoutDashboard,
      group: "Navigate",
      action: () => navigate("/staff/dashboard"),
      keywords: ["home", "overview"],
    },
    {
      id: "staff-schedule",
      label: "My Schedule",
      description: "View your shifts",
      icon: CalendarDays,
      group: "Navigate",
      action: () => navigate("/staff/schedule"),
      keywords: ["shifts", "calendar"],
    },
    {
      id: "staff-availability",
      label: "Availability",
      description: "Set your available hours",
      icon: Clock,
      group: "Navigate",
      action: () => navigate("/staff/availability"),
      keywords: ["hours", "free", "available"],
    },
    {
      id: "staff-swaps",
      label: "Swaps & Drops",
      description: "Manage shift trades",
      icon: ArrowLeftRight,
      group: "Navigate",
      action: () => navigate("/staff/swaps"),
      keywords: ["trade", "exchange", "drop", "pick up"],
    },
  ];

  switch (role) {
    case "ADMIN":
      return admin;
    case "MANAGER":
      return manager;
    case "STAFF":
      return staff;
  }
}

// ─── Command Palette Component ───────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useDashboard();

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      if (pathname !== path) router.push(path);
    },
    [router, pathname]
  );

  const commands = useMemo(
    () => getRouteCommands(profile.role, navigate),
    [profile.role, navigate]
  );

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((kw) => kw.includes(q))
    );
  }, [commands, query]);

  // Group filtered commands
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push(cmd);
    }
    return groups;
  }, [filtered]);

  // Keyboard: Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-1/2 top-[20%] z-[101] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or jump to…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-72 overflow-y-auto overscroll-contain py-2"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                      {group}
                    </div>
                    {items.map((cmd) => {
                      const flatIndex = filtered.indexOf(cmd);
                      const isSelected = flatIndex === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          data-index={flatIndex}
                          onClick={() => cmd.action()}
                          onMouseEnter={() => setSelectedIndex(flatIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <cmd.icon className="size-4 shrink-0 opacity-60" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{cmd.label}</span>
                            {cmd.description && (
                              <span className="text-muted-foreground text-xs ml-2">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 border-t px-4 py-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                  esc
                </kbd>
                Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
