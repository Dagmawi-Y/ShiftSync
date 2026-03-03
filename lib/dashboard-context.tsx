"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ───────────────────────────────────────────────

export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ManagedLocation {
  id: string;
  name: string;
  timezone: string;
}

interface DashboardContextValue {
  profile: UserProfile;
  locations: ManagedLocation[];
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

// ─── Context ─────────────────────────────────────────────

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────

export function DashboardProvider({
  profile,
  locations,
  children,
}: {
  profile: UserProfile;
  locations: ManagedLocation[];
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    locations.length > 0 ? locations[0].id : null
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Responsive detection
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    if (mql.matches) setSidebarOpen(false);

    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Keyboard shortcut: Cmd+B / Ctrl+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        if (isMobile) {
          setMobileOpen((prev) => !prev);
        } else {
          toggleSidebar();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, toggleSidebar]);

  return (
    <DashboardContext.Provider
      value={{
        profile,
        locations,
        selectedLocationId,
        setSelectedLocationId,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        isMobile,
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
