"use client";

import { Sidebar, MobileSidebar } from "./sidebar";
import { Header } from "./header";
import { PageTransition } from "./page-transition";
import { BottomTabBar } from "./bottom-tab-bar";
import { CommandPalette } from "./command-palette";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <SectionErrorBoundary section="Page">
            <PageTransition>
              <div className="p-4 md:p-6">{children}</div>
            </PageTransition>
          </SectionErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />

      {/* Command palette (Cmd+K) */}
      <CommandPalette />
    </div>
  );
}
